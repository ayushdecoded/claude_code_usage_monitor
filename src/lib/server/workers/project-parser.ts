import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import pLimit from 'p-limit';
import type { ProjectSummary, TokenUsage, SessionIndexEntry } from '@/lib/types';
import { calculateCost } from '../pricing';
import { streamJSONL } from '../streaming/readline-jsonl';

/**
 * Parses a single project directory and returns its summary.
 * This function is designed to run in worker threads.
 *
 * @param projectId - Directory name (e.g., "C--Users-foo-bar")
 * @param projectsDir - Absolute path to ~/.claude/projects/
 * @returns ProjectSummary with token usage and cost
 */
export async function parseProjectDirectory(
  projectId: string,
  projectsDir: string
): Promise<ProjectSummary | null> {
  const projectDirPath = join(projectsDir, projectId);

  // Try to read sessions-index.json for metadata
  let hasSessionsIndex = false;
  let sessionCount = 0;
  let messageCount = 0;
  let lastActive = new Date().toISOString();
  let projectPath = projectId;

  try {
    const content = await readFile(join(projectDirPath, 'sessions-index.json'), 'utf-8');
    const parsed = JSON.parse(content);
    const entries = parsed.entries as SessionIndexEntry[];

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
    // No sessions-index.json, will extract metadata from JSONL files
  }

  // Read JSONL files using streaming parser
  const totalTokens: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  const modelTokens: Record<string, TokenUsage> = {};
  let jsonlFiles: string[] = [];
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

          // Use streaming parser instead of split('\n')
          for await (const { data: obj } of streamJSONL(jsonlPath)) {
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
              totalTokens.cacheRead = (totalTokens.cacheRead || 0) + cacheReadTokens;
              totalTokens.cacheCreation = (totalTokens.cacheCreation || 0) + cacheCreationTokens;

              if (!modelTokens[model]) {
                modelTokens[model] = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
              }
              modelTokens[model].input += inputTokens;
              modelTokens[model].output += outputTokens;
              modelTokens[model].cacheRead = (modelTokens[model].cacheRead || 0) + cacheReadTokens;
              modelTokens[model].cacheCreation = (modelTokens[model].cacheCreation || 0) + cacheCreationTokens;
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

    // Apply extracted metadata for projects without sessions-index.json
    if (needsMetadata && jsonlFiles.length > 0) {
      sessionCount = jsonlFiles.length;
      messageCount = userMessageCount;
      if (latestTimestamp) lastActive = latestTimestamp;
      if (projectPath === projectId) {
        projectPath = projectId.replace(/C--/g, 'C:\\').replace(/--/g, '\\');
      }
    }
  } catch (error) {
    console.warn(`[Parser] Failed to parse project ${projectId}:`, error);
    return null;
  }

  // Skip projects with no sessions
  if (sessionCount === 0 && jsonlFiles.length === 0) {
    return null;
  }

  // Calculate estimated cost from per-model token usage
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

/**
 * Parses multiple projects (called by worker thread).
 */
export async function parseProjects(
  projectIds: string[],
  projectsDir: string
): Promise<ProjectSummary[]> {
  const results: ProjectSummary[] = [];

  for (const projectId of projectIds) {
    const summary = await parseProjectDirectory(projectId, projectsDir);
    if (summary) {
      results.push(summary);
    }
  }

  return results;
}
