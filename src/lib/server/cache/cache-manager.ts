import { stat } from 'fs/promises';
import { join } from 'path';
import type { ProjectSummary } from '@/lib/types';

export interface ProjectCacheEntry {
  projectId: string;
  mtime: number; // Directory modification time in milliseconds
  summary: ProjectSummary;
}

class ProjectCacheManager {
  private cache = new Map<string, ProjectCacheEntry>();
  private enabled: boolean;

  constructor() {
    // Allow disabling cache via environment variable
    this.enabled = process.env.USE_CACHE !== 'false';
    if (!this.enabled) {
      console.log('[Cache] Project cache disabled via USE_CACHE=false');
    }
  }

  /**
   * Extracts project ID from a file path like:
   * ~/.claude/projects/C--Users-foo-bar/session.jsonl → "C--Users-foo-bar"
   */
  extractProjectIdFromPath(filePath: string): string | null {
    const match = filePath.match(/[\\\/]projects[\\\/]([^\\\/]+)[\\\/]/);
    return match ? match[1] : null;
  }

  /**
   * Checks if a project needs re-parsing based on directory mtime.
   * Returns true if:
   * - Project is not in cache
   * - Directory mtime is newer than cached mtime
   * - Cache is disabled
   */
  async needsParsing(projectId: string, projectsDir: string): Promise<boolean> {
    if (!this.enabled) return true;

    const cached = this.cache.get(projectId);
    if (!cached) return true;

    try {
      const projectDirPath = join(projectsDir, projectId);
      const dirStat = await stat(projectDirPath);

      // Compare modification times (directory mtime updates when files change)
      return dirStat.mtimeMs > cached.mtime;
    } catch (error) {
      // If stat fails, assume needs parsing
      console.warn(`[Cache] Failed to stat project ${projectId}:`, error);
      return true;
    }
  }

  /**
   * Updates cache with newly parsed project data.
   */
  async updateCache(projectId: string, projectsDir: string, summary: ProjectSummary): Promise<void> {
    if (!this.enabled) return;

    try {
      const projectDirPath = join(projectsDir, projectId);
      const dirStat = await stat(projectDirPath);

      this.cache.set(projectId, {
        projectId,
        mtime: dirStat.mtimeMs,
        summary,
      });
    } catch (error) {
      console.warn(`[Cache] Failed to update cache for project ${projectId}:`, error);
    }
  }

  /**
   * Retrieves cached project summary if valid.
   */
  get(projectId: string): ProjectSummary | null {
    if (!this.enabled) return null;
    return this.cache.get(projectId)?.summary || null;
  }

  /**
   * Invalidates cache for a specific project (called when file changes detected).
   */
  invalidateProject(projectId: string): void {
    this.cache.delete(projectId);
    console.log(`[Cache] Invalidated cache for project: ${projectId}`);
  }

  /**
   * Returns cache statistics for monitoring.
   */
  getStats() {
    return {
      enabled: this.enabled,
      cachedProjects: this.cache.size,
    };
  }

  /**
   * Clears entire cache (useful for testing or debugging).
   */
  clear(): void {
    this.cache.clear();
    console.log('[Cache] Cleared all cached projects');
  }
}

// Export singleton instance
export const projectCache = new ProjectCacheManager();
