'use client';

import { useSSE } from '@/lib/client/use-sse';
import type { AggregateMetrics } from '@/lib/server/performance/metrics-tracker';

interface MetricsClientProps {
  initialMetrics: AggregateMetrics & { memory: { heapUsed: number; heapTotal: number; rss: number } | null };
  title?: string;
  subtitle?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatBytes(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function MetricsClient({ initialMetrics, title, subtitle }: MetricsClientProps) {
  // Connect to SSE for real-time updates (automatically refreshes page on data-refresh events)
  const { isConnected } = useSSE();

  const metrics = initialMetrics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white">{title || 'Performance Metrics'}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {subtitle || 'Real-time monitoring of parser performance, caching, and system resources'}
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Last Parse Time */}
        <div className="group bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Last Parse</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {metrics.lastParse ? `${metrics.lastParse.parseTimeMs}ms` : 'N/A'}
              </p>
              {metrics.lastParse && (
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(metrics.lastParse.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">⚡</div>
          </div>
        </div>

        {/* Average Parse Time */}
        <div className="group bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Avg Parse Time</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {metrics.averageParseTime.toFixed(0)}ms
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Range: {metrics.fastestParse}ms - {metrics.slowestParse}ms
              </p>
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">📊</div>
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div className="group bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Cache Hit Rate</p>
              <p className="mt-2 text-3xl font-bold text-green-400">
                {metrics.averageCacheHitRate.toFixed(1)}%
              </p>
              {metrics.lastParse && (
                <p className="mt-1 text-xs text-slate-500">
                  Last: {metrics.lastParse.cacheHitRate.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">💾</div>
          </div>
        </div>

        {/* Total Parses */}
        <div className="group bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Parses</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {metrics.totalParses}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Uptime: {formatDuration(metrics.uptime)}
              </p>
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">🔄</div>
          </div>
        </div>
      </div>

      {/* Worker & Throughput Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Worker Utilization */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Worker Utilization</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-400">Workers Used</p>
              <p className="text-2xl font-bold text-white">
                {metrics.lastParse?.usedWorkers ? metrics.lastParse.workerCount : 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Mode</p>
              <p className="text-lg font-semibold text-white">
                {metrics.lastParse?.usedWorkers ? 'Multi-threaded' : 'Single-threaded'}
              </p>
            </div>
          </div>
        </div>

        {/* Throughput */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Throughput</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-400">Files/Second (Last)</p>
              <p className="text-2xl font-bold text-white">
                {metrics.lastParse?.throughput.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Files Processed</p>
              <p className="text-lg font-semibold text-white">
                {metrics.totalFilesProcessed.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">System</h3>
          <div className="space-y-3">
            {metrics.memory ? (
              <>
                <div>
                  <p className="text-sm text-slate-400">Heap Used</p>
                  <p className="text-2xl font-bold text-white">
                    {formatBytes(metrics.memory.heapUsed)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">RSS</p>
                  <p className="text-lg font-semibold text-white">
                    {formatBytes(metrics.memory.rss)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Memory metrics unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Parse History */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Parse History</h3>
        {metrics.recentParses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr className="bg-slate-800/80">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Parse Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Cache Hit %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Files
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Workers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Throughput
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {metrics.recentParses.slice().reverse().map((parse, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                      {new Date(parse.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                      {parse.parseTimeMs}ms
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                      {parse.cachedProjects}/{parse.totalProjects}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-400 font-medium">
                      {parse.cacheHitRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                      {parse.filesProcessed}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                      {parse.usedWorkers ? parse.workerCount : 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                      {parse.throughput.toFixed(2)} f/s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">No parse history available yet</p>
        )}
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cache Efficiency */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Cache Efficiency</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Average Hit Rate</span>
              <span className="text-lg font-semibold text-green-400">
                {metrics.averageCacheHitRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${metrics.averageCacheHitRate}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Higher cache hit rates indicate better performance on hot reloads.
              Target: &gt;70% for development workflow.
            </p>
          </div>
        </div>

        {/* Parse Performance */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Parse Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Avg Parse Time</span>
              <span className="text-lg font-semibold text-blue-400">
                {metrics.averageParseTime.toFixed(0)}ms
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Fastest:</span>
                <span className="ml-2 font-semibold text-green-400">
                  {metrics.fastestParse}ms
                </span>
              </div>
              <div>
                <span className="text-slate-400">Slowest:</span>
                <span className="ml-2 font-semibold text-orange-400">
                  {metrics.slowestParse}ms
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Cold start target: &lt;2000ms. Hot reload target: &lt;100ms.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-500 pt-8 border-t border-slate-800">
        <p>
          Performance metrics are tracked in-memory and reset on server restart.
          {metrics.firstParseTimestamp && (
            <span className="ml-2">
              Tracking since {new Date(metrics.firstParseTimestamp).toLocaleString()}.
            </span>
          )}
        </p>
        <p className={`mt-2 text-xs ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
          ● {isConnected ? 'Live' : 'Connecting...'} - Updates automatically when data refreshes
        </p>
      </div>
    </div>
  );
}
