/**
 * Self-contained worker for parsing Claude project JSONL files.
 *
 * Uses only Node.js built-ins — no TypeScript, no path aliases, no bundler involvement.
 * This file is intentionally standalone to avoid Turbopack __dirname issues.
 *
 * Communication via child_process IPC:
 *   Receives: { projectIds: string[], projectsDir: string }
 *   Sends:    ProjectSummary[]
 */

import { readdir, readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, basename } from 'node:path';
import pLimit from 'p-limit';

// --- Inlined pricing logic (mirrors src/lib/server/pricing.ts) ---

const PRICING = {
  opus:   { inputRate: 5,  outputRate: 25, cacheReadRate: 0.50, cacheCreateRate: 6.25 },
  sonnet: { inputRate: 3,  outputRate: 15, cacheReadRate: 0.30, cacheCreateRate: 3.75 },
  haiku:  { inputRate: 1,  outputRate: 5,  cacheReadRate: 0.10, cacheCreateRate: 1.25 },
};

function matchPricing(model) {
  const m = model.toLowerCase();
  if (m.includes('opus')) return PRICING.opus;
  if (m.includes('haiku')) return PRICING.haiku;
  return PRICING.sonnet; // default
}

function calculateCost(tokens, model) {
  const p = matchPricing(model);
  let cost = 0;
  cost += (tokens.input / 1_000_000) * p.inputRate;
  cost += (tokens.output / 1_000_000) * p.outputRate;
  if (tokens.cacheRead && p.cacheReadRate) cost += (tokens.cacheRead / 1_000_000) * p.cacheReadRate;
  if (tokens.cacheCreation && p.cacheCreateRate) cost += (tokens.cacheCreation / 1_000_000) * p.cacheCreateRate;
  return cost;
}

// --- Streaming JSONL reader (mirrors src/lib/server/streaming/readline-jsonl.ts) ---

async function* streamJSONL(filePath) {
  const stream = createReadStream(filePath, {
    encoding: 'utf-8',
    highWaterMark: 64 * 1024,
  });

  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    try {
      yield JSON.parse(trimmed);
    } catch {
      // Skip malformed lines silently in worker
    }
  }
}

// --- Project parser (mirrors src/lib/server/workers/project-parser.ts) ---

async function parseProjectDirectory(projectId, projectsDir) {
  const projectDirPath = join(projectsDir, projectId);

  let hasSessionsIndex = false;
  let sessionCount = 0;
  let messageCount = 0;
  let lastActive = new Date().toISOString();
  let projectPath = projectId;

  // Try sessions-index.json
  try {
    const content = await readFile(join(projectDirPath, 'sessions-index.json'), 'utf-8');
    const parsed = JSON.parse(content);
    const entries = parsed.entries;

    if (Array.isArray(entries) && entries.length > 0) {
      hasSessionsIndex = true;
      sessionCount = entries.length;
      lastActive = entries[0]?.modified || lastActive;

      for (const entry of entries) {
        messageCount += entry.messageCount || 0;
        if (entry.modified > lastActive) lastActive = entry.modified;
      }

      projectPath = entries[0]?.projectPath || projectId;
    }
  } catch {
    // No sessions-index.json
  }

  // Read JSONL files
  const totalTokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  const modelTokens = {};
  let jsonlFiles = [];
  const needsMetadata = !hasSessionsIndex;
  let userMessageCount = 0;
  let latestTimestamp = '';

  try {
    const projectFiles = await readdir(projectDirPath);
    jsonlFiles = projectFiles.filter(f => f.endsWith('.jsonl'));

    // Process JSONL files in parallel with concurrency limit
    const limit = pLimit(16); // 16 concurrent file reads
    await Promise.all(
      jsonlFiles.map(jsonlFile =>
        limit(async () => {
          const jsonlPath = join(projectDirPath, jsonlFile);

          for await (const obj of streamJSONL(jsonlPath)) {
            // Token extraction
            if (obj.type === 'assistant' && obj.message?.usage) {
              const usage = obj.message.usage;
              const model = obj.message.model || 'unknown';

              const inputTokens = usage.input_tokens || 0;
              const outputTokens = usage.output_tokens || 0;
              const cacheReadTokens = usage.cache_read_input_tokens || 0;
              const cacheCreationTokens = usage.cache_creation_input_tokens || 0;

              totalTokens.input += inputTokens;
              totalTokens.output += outputTokens;
              totalTokens.cacheRead += cacheReadTokens;
              totalTokens.cacheCreation += cacheCreationTokens;

              if (!modelTokens[model]) {
                modelTokens[model] = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
              }
              modelTokens[model].input += inputTokens;
              modelTokens[model].output += outputTokens;
              modelTokens[model].cacheRead += cacheReadTokens;
              modelTokens[model].cacheCreation += cacheCreationTokens;
            }

            // Metadata extraction (only when no sessions-index.json)
            if (needsMetadata) {
              if (obj.type === 'user' && obj.cwd && projectPath === projectId) {
                projectPath = obj.cwd;
              }
              if (obj.type === 'user' && obj.isMeta !== true) {
                userMessageCount++;
              }
              if (obj.timestamp && obj.timestamp > latestTimestamp) {
                latestTimestamp = obj.timestamp;
              }
            }
          }
        })
      )
    );

    if (needsMetadata && jsonlFiles.length > 0) {
      sessionCount = jsonlFiles.length;
      messageCount = userMessageCount;
      if (latestTimestamp) lastActive = latestTimestamp;
      if (projectPath === projectId) {
        projectPath = projectId.replace(/C--/g, 'C:\\').replace(/--/g, '\\');
      }
    }
  } catch {
    return null;
  }

  if (sessionCount === 0 && jsonlFiles.length === 0) return null;

  let estimatedCost = 0;
  for (const [model, tokens] of Object.entries(modelTokens)) {
    estimatedCost += calculateCost(tokens, model);
  }

  return {
    name: basename(projectPath),
    path: projectPath,
    sessionCount,
    messageCount,
    totalTokens,
    lastActive,
    estimatedCost,
  };
}

// --- Main worker execution via child_process IPC ---

process.on('message', async ({ projectIds, projectsDir }) => {
  const results = [];
  for (const projectId of projectIds) {
    try {
      const summary = await parseProjectDirectory(projectId, projectsDir);
      if (summary) results.push(summary);
    } catch (err) {
      process.stderr.write(`[Worker] Failed to parse ${projectId}: ${err.message}\n`);
    }
  }
  process.send(results);
  process.exit(0);
});
