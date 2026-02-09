/**
 * Performance metrics tracker for monitoring parser and system performance.
 * Tracks parse times, cache hit rates, worker utilization, and throughput.
 */

export interface ParseMetrics {
  timestamp: string;
  totalProjects: number;
  cachedProjects: number;
  parsedProjects: number;
  parseTimeMs: number;
  cacheHitRate: number;
  usedWorkers: boolean;
  workerCount: number;
  filesProcessed: number;
  errorCount: number;
  throughput: number; // files per second
}

export interface AggregateMetrics {
  totalParses: number;
  averageParseTime: number;
  averageCacheHitRate: number;
  totalFilesProcessed: number;
  totalErrors: number;
  fastestParse: number;
  slowestParse: number;
  lastParse: ParseMetrics | null;
  recentParses: ParseMetrics[]; // Last 20 parses
  uptime: number; // seconds since first parse
  firstParseTimestamp: string | null;
}

class PerformanceMetricsTracker {
  private metrics: ParseMetrics[] = [];
  private maxHistorySize = 100; // Keep last 100 parses
  private startTime = Date.now();

  /**
   * Records a new parse operation with its metrics.
   */
  recordParse(metrics: Omit<ParseMetrics, 'timestamp'>): void {
    const parseMetric: ParseMetrics = {
      ...metrics,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(parseMetric);

    // Keep only recent history
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }

    // Log performance summary
    console.log(`[Metrics] Parse completed: ${metrics.parseTimeMs}ms, cache hit: ${metrics.cacheHitRate.toFixed(1)}%, workers: ${metrics.usedWorkers ? metrics.workerCount : 0}`);
  }

  /**
   * Returns aggregate metrics across all recorded parses.
   */
  getAggregateMetrics(): AggregateMetrics {
    if (this.metrics.length === 0) {
      return {
        totalParses: 0,
        averageParseTime: 0,
        averageCacheHitRate: 0,
        totalFilesProcessed: 0,
        totalErrors: 0,
        fastestParse: 0,
        slowestParse: 0,
        lastParse: null,
        recentParses: [],
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        firstParseTimestamp: null,
      };
    }

    const totalParseTime = this.metrics.reduce((sum, m) => sum + m.parseTimeMs, 0);
    const totalCacheHitRate = this.metrics.reduce((sum, m) => sum + m.cacheHitRate, 0);
    const parseTimes = this.metrics.map(m => m.parseTimeMs);

    return {
      totalParses: this.metrics.length,
      averageParseTime: totalParseTime / this.metrics.length,
      averageCacheHitRate: totalCacheHitRate / this.metrics.length,
      totalFilesProcessed: this.metrics.reduce((sum, m) => sum + m.filesProcessed, 0),
      totalErrors: this.metrics.reduce((sum, m) => sum + m.errorCount, 0),
      fastestParse: Math.min(...parseTimes),
      slowestParse: Math.max(...parseTimes),
      lastParse: this.metrics[this.metrics.length - 1],
      recentParses: this.metrics.slice(-20), // Last 20
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      firstParseTimestamp: this.metrics[0]?.timestamp || null,
    };
  }

  /**
   * Returns recent parse history for charting.
   */
  getRecentHistory(limit = 20): ParseMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Clears all recorded metrics (for testing/debugging).
   */
  clear(): void {
    this.metrics = [];
    this.startTime = Date.now();
    console.log('[Metrics] Cleared all performance metrics');
  }

  /**
   * Returns current memory usage if available (in MB).
   */
  getMemoryUsage(): { heapUsed: number; heapTotal: number; rss: number } | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
      };
    }
    return null;
  }
}

// Export singleton instance
export const metricsTracker = new PerformanceMetricsTracker();
