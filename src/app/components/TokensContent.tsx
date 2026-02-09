'use client';

import type { DashboardData } from '@/lib/types';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatMillions(n: number): string {
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export default function TokensContent({ data }: { data: DashboardData }) {
  const {
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
    modelBreakdown,
  } = data;

  const totalTokens =
    totalInputTokens +
    totalOutputTokens +
    totalCacheReadTokens +
    totalCacheCreationTokens;

  const nonCacheTokens = totalInputTokens + totalOutputTokens;

  // Calculate percentages
  const inputPercent = (totalInputTokens / totalTokens) * 100 || 0;
  const outputPercent = (totalOutputTokens / totalTokens) * 100 || 0;
  const cacheReadPercent = (totalCacheReadTokens / totalTokens) * 100 || 0;
  const cacheCreatePercent = (totalCacheCreationTokens / totalTokens) * 100 || 0;

  const models = Object.entries(modelBreakdown)
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => b.tokenUsage.input + b.tokenUsage.output - (a.tokenUsage.input + a.tokenUsage.output));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Token Usage</h1>
        <p className="text-slate-400">Detailed breakdown of token consumption by type and model</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Tokens</p>
              <p className="text-3xl font-bold text-white font-mono">{formatMillions(totalTokens)}</p>
            </div>
            <div className="text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">🔢</div>
          </div>
        </div>

        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Input Tokens</p>
              <p className="text-3xl font-bold text-blue-400 font-mono">{formatMillions(totalInputTokens)}</p>
            </div>
            <div className="text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">📥</div>
          </div>
        </div>

        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Output Tokens</p>
              <p className="text-3xl font-bold text-purple-400 font-mono">{formatMillions(totalOutputTokens)}</p>
            </div>
            <div className="text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">📤</div>
          </div>
        </div>

        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Non-Cache Tokens</p>
              <p className="text-3xl font-bold text-emerald-400 font-mono">{formatMillions(nonCacheTokens)}</p>
            </div>
            <div className="text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">⚡</div>
          </div>
        </div>
      </div>

      {/* Token Breakdown Visualization */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Token Distribution</h2>

        <div className="space-y-4">
          {/* Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Input Tokens</span>
              <span className="text-sm text-slate-400">{inputPercent.toFixed(1)}% • {formatMillions(totalInputTokens)}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${inputPercent}%` }} />
            </div>
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Output Tokens</span>
              <span className="text-sm text-slate-400">{outputPercent.toFixed(1)}% • {formatMillions(totalOutputTokens)}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${outputPercent}%` }} />
            </div>
          </div>

          {/* Cache Read */}
          {totalCacheReadTokens > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Cache Read Tokens</span>
                <span className="text-sm text-slate-400">{cacheReadPercent.toFixed(1)}% • {formatMillions(totalCacheReadTokens)}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${cacheReadPercent}%` }} />
              </div>
            </div>
          )}

          {/* Cache Creation */}
          {totalCacheCreationTokens > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Cache Creation Tokens</span>
                <span className="text-sm text-slate-400">{cacheCreatePercent.toFixed(1)}% • {formatMillions(totalCacheCreationTokens)}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="bg-pink-500 h-full rounded-full" style={{ width: `${cacheCreatePercent}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Breakdown Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Usage by Model</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-slate-400 font-medium">Model</th>
                <th className="px-6 py-3 text-right text-slate-400 font-medium">Input</th>
                <th className="px-6 py-3 text-right text-slate-400 font-medium">Output</th>
                <th className="px-6 py-3 text-right text-slate-400 font-medium">Cache Read</th>
                <th className="px-6 py-3 text-right text-slate-400 font-medium">Cache Create</th>
                <th className="px-6 py-3 text-right text-slate-400 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {models.map((model) => {
                const modelTotal =
                  model.tokenUsage.input +
                  model.tokenUsage.output +
                  (model.tokenUsage.cacheRead || 0) +
                  (model.tokenUsage.cacheCreation || 0);

                return (
                  <tr key={model.name} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-slate-200 font-medium">{model.name}</td>
                    <td className="px-6 py-4 text-right text-blue-400 font-mono">{formatMillions(model.tokenUsage.input)}</td>
                    <td className="px-6 py-4 text-right text-purple-400 font-mono">{formatMillions(model.tokenUsage.output)}</td>
                    <td className="px-6 py-4 text-right text-cyan-400 font-mono">{formatMillions(model.tokenUsage.cacheRead || 0)}</td>
                    <td className="px-6 py-4 text-right text-pink-400 font-mono">{formatMillions(model.tokenUsage.cacheCreation || 0)}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-mono font-bold">{formatMillions(modelTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {models.length === 0 && (
          <div className="px-6 py-8 text-center text-slate-400">
            No model data available
          </div>
        )}
      </div>
    </div>
  );
}
