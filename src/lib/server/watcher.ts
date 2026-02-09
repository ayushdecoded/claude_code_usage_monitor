/**
 * File watcher for ~/.claude/ changes.
 * Monitors for updates to stats-cache.json, history.jsonl, sessions-index.json, and session files.
 * On changes, triggers incremental data store refresh.
 */

import path from 'path';
import os from 'os';
import { invalidateCache } from './dashboard';

let watcherInitialized = false;

export async function initializeWatcher(): Promise<void> {
  if (watcherInitialized) return;
  watcherInitialized = true;

  try {
    const claudePath = path.join(os.homedir(), '.claude');
    console.log(`[Watcher] Monitoring ${claudePath} for changes`);

    // Dynamic import of chokidar to avoid issues on non-Node.js environments
    const chokidar = await import('chokidar');

    const watcher = chokidar.watch([
      path.join(claudePath, 'stats-cache.json'),
      path.join(claudePath, 'history.jsonl'),
      path.join(claudePath, 'projects/**/*.json'),
      path.join(claudePath, 'projects/**/*.jsonl'),
    ], {
      ignored: /(^|[\/\\])\.|node_modules/,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      usePolling: true, // Use polling on Windows
      interval: 1000,
      binaryInterval: 2000,
    });

    watcher.on('change', async (filePath) => {
      console.log(`[Watcher] File changed: ${filePath}`);

      // Track session activity (session JSONL files only, not sessions-index)
      if (filePath.endsWith('.jsonl') && !filePath.includes('sessions-index')) {
        const { sessionTracker } = await import('./session-tracker');
        sessionTracker.onFileChange(filePath);
      }

      await invalidateCache(filePath); // Pass filePath for incremental updates
    });

    watcher.on('error', (error) => {
      console.error(`[Watcher] Error:`, error);
    });

    // Periodic grace period status logging
    setInterval(async () => {
      const { sessionTracker } = await import('./session-tracker');
      const state = sessionTracker.getState();

      if (state.state === 'GRACE_PERIOD' && state.graceTimer.active) {
        const minutes = Math.ceil(state.graceTimer.remainingMs / 60000);
        console.log(`[SessionTracker] Grace period: ${minutes}m remaining`);
      }
    }, 60000); // Log every minute during grace period

    // Keep the watcher alive (don't close it)
  } catch (error) {
    console.error('[Watcher] Failed to initialize:', error);
  }
}
