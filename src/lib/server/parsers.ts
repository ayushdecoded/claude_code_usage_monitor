import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir, cpus } from 'os';
import { spawn } from 'child_process';
import type { StatsCache, ProjectSummary } from '@/lib/types';
import { projectCache } from './cache/cache-manager';
import { parseProjects } from './workers/project-parser';
import { metricsTracker } from './performance/metrics-tracker';

const CLAUDE_DIR = join(homedir(), '.claude');
const USE_WORKERS = process.env.USE_WORKERS !== 'false';

export async function parseStatsCache(): Promise<StatsCache | null> {
  try {
    const content = await readFile(join(CLAUDE_DIR, 'stats-cache.json'), 'utf-8');
    const parsed = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as StatsCache;
  } catch {
    console.warn('Failed to parse stats-cache.json');
    return null;
  }
}

/**
 * Helper to chunk array into smaller arrays for parallel processing.
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Runs a child process to parse projects in parallel.
 * Uses spawn() with IPC channel — Turbopack doesn't trace spawn args as module deps.
 */
function runWorker(projectIds: string[], projectsDir: string): Promise<ProjectSummary[]> {
  const workerPath = join(process.cwd(), 'scripts', 'parse-worker.mjs');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath], {
      stdio: ['pipe', 'pipe', 'inherit', 'ipc'],
    });

    child.on('message', (results: ProjectSummary[]) => {
      resolve(results);
    });

    child.on('error', (error: Error) => {
      reject(error);
    });

    child.on('exit', (code: number | null) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });

    // Send task to child process via IPC
    child.send({ projectIds, projectsDir });
  });
}

/**
 * Parses projects using worker_threads for parallelization.
 */
async function parseProjectsWithWorkers(projectIds: string[]): Promise<ProjectSummary[]> {
  const numCPUs = cpus().length;
  // Use at most 4 workers (diminishing returns beyond that for I/O-bound work)
  const maxWorkers = Math.min(4, numCPUs, projectIds.length);
  const chunkSize = Math.ceil(projectIds.length / maxWorkers);
  const chunks = chunkArray(projectIds, Math.max(1, chunkSize));

  console.log(`[Parser] Using ${chunks.length} worker threads for ${projectIds.length} projects`);

  const results = await Promise.all(
    chunks.map(chunk =>
      runWorker(chunk, join(CLAUDE_DIR, 'projects'))
    )
  );

  return results.flat();
}

/**
 * Single-threaded fallback for worker failures.
 */
async function parseProjectsSingleThreaded(projectIds: string[]): Promise<ProjectSummary[]> {
  console.log(`[Parser] Using single-threaded parsing for ${projectIds.length} projects`);
  return parseProjects(projectIds, join(CLAUDE_DIR, 'projects'));
}

/**
 * Main parsing function with caching and worker support.
 * @param changedFile - Optional file path that triggered the refresh (for cache invalidation)
 */
export async function parseAllSessionsIndex(changedFile?: string): Promise<ProjectSummary[]> {
  const startTime = Date.now();
  const projectsDir = join(CLAUDE_DIR, 'projects');

  let projectDirs: string[];
  try {
    projectDirs = await readdir(projectsDir);
  } catch {
    // Record metrics even when projects directory doesn't exist
    const parseTime = Date.now() - startTime;
    metricsTracker.recordParse({
      totalProjects: 0,
      cachedProjects: 0,
      parsedProjects: 0,
      parseTimeMs: parseTime,
      cacheHitRate: 0,
      usedWorkers: false,
      workerCount: 0,
      filesProcessed: 0,
      errorCount: 1,
      throughput: 0,
    });
    console.log('[Parser] Projects directory not found or inaccessible');
    return [];
  }

  // Invalidate cache for changed project
  if (changedFile) {
    const projectId = projectCache.extractProjectIdFromPath(changedFile);
    if (projectId) {
      projectCache.invalidateProject(projectId);
      console.log(`[Parser] Detected change in project: ${projectId}`);
    }
  }

  // Separate projects into cached and needs-parsing
  const projectsToParse: string[] = [];
  const cachedSummaries: ProjectSummary[] = [];

  for (const projectId of projectDirs) {
    const needsParsing = await projectCache.needsParsing(projectId, projectsDir);

    if (needsParsing) {
      projectsToParse.push(projectId);
    } else {
      const cached = projectCache.get(projectId);
      if (cached) {
        cachedSummaries.push(cached);
      }
    }
  }

  console.log(`[Parser] Cache status: ${cachedSummaries.length} cached, ${projectsToParse.length} need parsing`);

  // Parse projects that need updating
  let parsedProjects: ProjectSummary[] = [];
  let usedWorkers = false;

  if (projectsToParse.length > 0) {
    if (USE_WORKERS && projectsToParse.length >= 2) {
      try {
        parsedProjects = await parseProjectsWithWorkers(projectsToParse);
        usedWorkers = true;
      } catch (error) {
        console.warn('[Parser] Worker pool failed, falling back to single-threaded:', error);
        parsedProjects = await parseProjectsSingleThreaded(projectsToParse);
        usedWorkers = false;
      }
    } else {
      parsedProjects = await parseProjectsSingleThreaded(projectsToParse);
      usedWorkers = false;
    }

    // Update cache with newly parsed projects
    for (const summary of parsedProjects) {
      const projectId = projectDirs.find(id =>
        summary.path.includes(id) || id.includes(summary.name)
      );
      if (projectId) {
        await projectCache.updateCache(projectId, projectsDir, summary);
      }
    }
  }

  // Merge cached and newly parsed projects
  const allProjects = [...cachedSummaries, ...parsedProjects];

  // Sort by most recent activity
  allProjects.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

  const parseTime = Date.now() - startTime;
  const cacheHitRate = projectDirs.length > 0
    ? (cachedSummaries.length / projectDirs.length) * 100
    : 0;

  // Calculate total files processed
  const filesProcessed = allProjects.reduce((sum, p) => sum + p.sessionCount, 0);
  const throughput = parseTime > 0 ? (filesProcessed / parseTime) * 1000 : 0;

  // Record metrics for dashboard
  metricsTracker.recordParse({
    totalProjects: projectDirs.length,
    cachedProjects: cachedSummaries.length,
    parsedProjects: parsedProjects.length,
    parseTimeMs: parseTime,
    cacheHitRate,
    usedWorkers,
    workerCount: usedWorkers ? Math.min(4, cpus().length, projectsToParse.length) : 0,
    filesProcessed,
    errorCount: 0, // Could be enhanced to track errors
    throughput,
  });

  console.log(`[Parser] Performance: {
  totalProjects: ${projectDirs.length},
  cachedProjects: ${cachedSummaries.length},
  parsedProjects: ${parsedProjects.length},
  parseTimeMs: ${parseTime},
  cacheHitRate: ${cacheHitRate.toFixed(1)}%,
  usedWorkers: ${usedWorkers}
}`);

  return allProjects;
}
