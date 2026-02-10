'use client';

import { useState, useMemo } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import type { DashboardData } from '@/lib/types';

interface CostsContentProps {
  data: DashboardData;
}

type TimeRange = '7D' | '14D' | '30D' | '3M' | '1Y' | 'All';

// Helper functions
function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM dd');
  } catch {
    return dateStr;
  }
}

function prettifyModel(name: string): string {
  // Dynamically capitalize the model family name
  // "opus" → "Opus", "sonnet" → "Sonnet", "new-model" → "New-Model"
  // This automatically handles new Anthropic releases without code changes
  if (!name) return name;
  const words = name.toLowerCase().split('-');
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
}

function modelColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('opus')) return '#7C3AED';
  if (n.includes('sonnet')) return '#3B82F6';
  if (n.includes('haiku')) return '#10B981';
  return '#6B7280';
}

function modelBgClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('opus')) return 'bg-purple-500/10 border-purple-500/20';
  if (n.includes('sonnet')) return 'bg-blue-500/10 border-blue-500/20';
  if (n.includes('haiku')) return 'bg-emerald-500/10 border-emerald-500/20';
  return 'bg-slate-500/10 border-slate-500/20';
}

function modelTextClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('opus')) return 'text-purple-400';
  if (n.includes('sonnet')) return 'text-blue-400';
  if (n.includes('haiku')) return 'text-emerald-400';
  return 'text-slate-400';
}

function niceScale(maxVal: number): { niceMax: number; ticks: number[] } {
  if (maxVal <= 0) return { niceMax: 1, ticks: [0, 1] };

  const values: number[] = [];
  for (let m = 0; m <= 10; m++) {
    for (let n = 0; n <= 30; n++) {
      const v = Math.pow(5, m) * Math.pow(2, n);
      if (v > maxVal * 100) break;
      values.push(v);
    }
  }
  values.sort((a, b) => a - b);
  const niceMax = values.find(v => v >= maxVal) || maxVal;

  const candidates = [4, 5, 2, 8, 10].map(d => ({ d, step: niceMax / d }));
  const best = candidates.find(c => Number.isInteger(c.step) && c.d >= 2 && c.d <= 6)
    || candidates.find(c => Number.isInteger(c.step))
    || { d: 4, step: niceMax / 4 };

  const ticks: number[] = [];
  for (let i = 0; i <= best.d; i++) {
    ticks.push(Math.round(best.step * i));
  }
  return { niceMax, ticks };
}

export default function CostsContent({ data }: CostsContentProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('All');

  const {
    stats,
    projects,
    totalEstimatedCost,
    modelBreakdown,
    dailyCosts,
    topProjectsByCost,
  } = data;

  // Compute available ranges
  const availableRanges = useMemo(() => {
    if (!stats.dailyActivity || stats.dailyActivity.length === 0) {
      return new Set<TimeRange>(['All']);
    }
    const sorted = [...stats.dailyActivity].sort((a, b) => a.date.localeCompare(b.date));
    const earliest = new Date(sorted[0].date);
    const now = new Date();
    const daySpan = Math.ceil((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
    const available = new Set<TimeRange>();
    if (daySpan >= 7) available.add('7D');
    if (daySpan >= 14) available.add('14D');
    if (daySpan >= 30) available.add('30D');
    if (daySpan >= 90) available.add('3M');
    if (daySpan >= 365) available.add('1Y');
    available.add('All');
    return available;
  }, [stats.dailyActivity]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (selectedRange === 'All') {
      return {
        filteredCosts: dailyCosts,
        totalCost: totalEstimatedCost,
        avgCostPerDay: dailyCosts.length > 0 ? totalEstimatedCost / dailyCosts.length : 0,
      };
    }

    const now = new Date();
    let cutoffDate: Date;

    if (selectedRange === '7D') {
      cutoffDate = subDays(now, 7);
    } else if (selectedRange === '14D') {
      cutoffDate = subDays(now, 14);
    } else if (selectedRange === '30D') {
      cutoffDate = subDays(now, 30);
    } else if (selectedRange === '3M') {
      cutoffDate = subDays(now, 90);
    } else {
      cutoffDate = subDays(now, 365);
    }

    // Calculate proportion of time range to scale costs
    // Note: We can't use dailyCosts directly when token filters are active because
    // dailyCosts from server only include non-cache costs
    const allTimeDays = dailyCosts.length;
    const filteredCosts = dailyCosts.filter(d => new Date(d.date) >= cutoffDate);
    const filteredDays = filteredCosts.length;
    const timeProportion = allTimeDays > 0 ? filteredDays / allTimeDays : 0;

    // Scale the already-filtered totalEstimatedCost by time proportion
    const totalCost = totalEstimatedCost * timeProportion;

    return {
      filteredCosts,
      totalCost,
      avgCostPerDay: filteredDays > 0 ? totalCost / filteredDays : 0,
    };
  }, [selectedRange, dailyCosts, totalEstimatedCost]);

  const ranges: TimeRange[] = ['7D', '14D', '30D', '3M', '1Y', 'All'];
  const sortedModels = Object.entries(modelBreakdown).sort((a, b) => b[1].estimatedCost - a[1].estimatedCost);
  const maxCost = Math.max(...filteredData.filteredCosts.map(d => d.cost), 1);
  const { niceMax } = niceScale(maxCost);
  const maxProjectCost = Math.max(...topProjectsByCost.map(p => p.estimatedCost), 1);

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Time Range Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-white">Costs</h2>
          <div className="flex flex-wrap gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            {ranges.map((range) => {
              const disabled = !availableRanges.has(range);
              return (
                <button
                  key={range}
                  onClick={() => !disabled && setSelectedRange(range)}
                  disabled={disabled}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 whitespace-nowrap ${
                    disabled
                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50'
                      : selectedRange === range
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-105'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data range info */}
        <div className="text-xs text-slate-400 bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          📅 Data available: {filteredData.filteredCosts.length} days
          {filteredData.filteredCosts.length > 0 && (
            <span>
              {' '}({formatDate(filteredData.filteredCosts[0]!.date)} to {formatDate(filteredData.filteredCosts[filteredData.filteredCosts.length - 1]!.date)})
            </span>
          )}
        </div>
      </div>

      {/* 1. Cost Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono transition-all duration-300">
            {formatCost(filteredData.totalCost)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {filteredData.filteredCosts.length} {filteredData.filteredCosts.length === 1 ? 'day' : 'days'}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Average / Day</p>
          <p className="text-3xl font-bold text-blue-400 font-mono transition-all duration-300">
            {formatCost(filteredData.avgCostPerDay)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Based on tracked days</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Avg Cost / Session</p>
          <p className="text-3xl font-bold text-purple-400 font-mono transition-all duration-300">
            {formatCost(data.avgCostPerSession)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{stats.totalSessions.toLocaleString()} sessions</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Avg Cost / Message</p>
          <p className="text-3xl font-bold text-orange-400 font-mono transition-all duration-300">
            {formatCost(data.avgCostPerMessage)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{stats.totalMessages.toLocaleString()} messages</p>
        </div>
      </div>

      {/* 2. Daily Cost Trend Chart */}
      {filteredData.filteredCosts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Daily Cost Trend</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            {/* Chart wrapper */}
            <div className="relative">
              {/* Chart area */}
              <div className="flex items-end gap-1 h-72 px-2 pt-4 pb-8 relative bg-slate-900/20 rounded-lg border border-slate-700/30">
                {/* Y-axis gridlines and labels */}
                <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-slate-500 pointer-events-none pr-2">
                  <span className="text-right">${(niceMax / 1000).toFixed(0)}k</span>
                  <span className="text-right">${(niceMax / 2 / 1000).toFixed(1)}k</span>
                  <span className="text-right">$0</span>
                </div>

                {/* Bars */}
                <div className="flex-1 flex items-end justify-between gap-1 ml-16">
                  {filteredData.filteredCosts.map((day, idx) => {
                    // Calculate bar height in pixels (out of available space)
                    const chartHeight = 256; // Approximate height of chart area in pixels
                    const barHeightPx = niceMax > 0 ? (day.cost / niceMax) * chartHeight : 0;

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end group"
                        title={`${formatDate(day.date)}: ${formatCost(day.cost)}`}
                      >
                        {/* Bar */}
                        <div
                          className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all duration-200 hover:from-emerald-400 hover:to-emerald-300 hover:shadow-lg hover:shadow-emerald-500/50"
                          style={{
                            height: `${Math.max(barHeightPx, 2)}px`,
                          }}
                        />

                        {/* Value tooltip on hover */}
                        <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {formatCost(day.cost)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-axis labels (dates) */}
              {filteredData.filteredCosts.length <= 31 && (
                <div className="flex mt-3 gap-1 ml-16 text-xs text-slate-500">
                  {filteredData.filteredCosts.map((day, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      {formatDate(day.date)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div className="mt-6 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700 pt-4">
              <span>Start: {formatDate(filteredData.filteredCosts[0]!.date)}</span>
              <span>Peak: {formatCost(maxCost)}</span>
              <span>End: {formatDate(filteredData.filteredCosts[filteredData.filteredCosts.length - 1]!.date)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cost by Model */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Cost by Model</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sortedModels.map(([model, info]) => {
            const costPct = totalEstimatedCost > 0 ? (info.estimatedCost / totalEstimatedCost * 100) : 0;

            return (
              <div
                key={model}
                className={`relative rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/60 ${modelBgClass(model)}`}
              >
                {/* Accent gradient top border */}
                <div className="h-1" style={{ background: `linear-gradient(to right, ${modelColor(model)}, ${modelColor(model)}66)` }} />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${modelColor(model)}20` }}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: modelColor(model), boxShadow: `0 0 12px ${modelColor(model)}60` }} />
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${modelTextClass(model)}`}>{prettifyModel(model)}</h3>
                        <p className="text-xs text-slate-500">{costPct.toFixed(1)}% of total</p>
                      </div>
                    </div>
                  </div>

                  {/* Big cost number */}
                  <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                    <p className="text-xs text-slate-500 mb-1">Total Cost</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">{formatCost(info.estimatedCost)}</p>
                  </div>

                  {/* Cost bar */}
                  <div className="mb-4">
                    <div className="h-3 bg-slate-900/40 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${costPct}%`,
                          backgroundColor: modelColor(model),
                        }}
                      />
                    </div>
                  </div>

                  {/* Token breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tokens</span>
                      <span className="text-white font-mono">
                        {(Math.round(((info.tokenUsage.input || 0) + (info.tokenUsage.output || 0) + (info.tokenUsage.cacheRead || 0) + (info.tokenUsage.cacheCreation || 0)) / 1000) / 1000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Per 1M tokens</span>
                      <span className="font-mono">
                        {(info.tokenUsage.input || 0) + (info.tokenUsage.output || 0) + (info.tokenUsage.cacheRead || 0) + (info.tokenUsage.cacheCreation || 0) > 0
                          ? formatCost(info.estimatedCost / (((info.tokenUsage.input || 0) + (info.tokenUsage.output || 0) + (info.tokenUsage.cacheRead || 0) + (info.tokenUsage.cacheCreation || 0)) / 1_000_000))
                          : '$0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Cost by Project */}
      {topProjectsByCost.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Cost by Project</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <div className="space-y-4">
              {topProjectsByCost.slice(0, 10).map((proj, idx) => {
                const widthPct = (proj.estimatedCost / maxProjectCost) * 100;
                const costPct = totalEstimatedCost > 0 ? (proj.estimatedCost / totalEstimatedCost * 100) : 0;

                return (
                  <div key={proj.path}>
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-xs text-slate-500 font-mono w-6 shrink-0 mt-0.5">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm text-white truncate flex-1 mr-2 font-medium">{proj.name}</span>
                          <div className="flex items-baseline gap-3">
                            <span className="text-xs text-emerald-400 font-mono">{formatCost(proj.estimatedCost)}</span>
                            <span className="text-xs text-slate-500 w-10 text-right">{costPct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{proj.path}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden ml-9">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        style={{ width: `${Math.max(widthPct, 2)}%`, transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 50}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Cost Distribution Summary */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Cost Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <h3 className="text-sm font-semibold text-emerald-400 mb-4">● By Model</h3>
            <div className="space-y-3">
              {sortedModels.slice(0, 5).map(([model, info]) => {
                const pct = totalEstimatedCost > 0 ? (info.estimatedCost / totalEstimatedCost * 100) : 0;
                return (
                  <div key={model} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{prettifyModel(model)}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-mono text-emerald-400">{formatCost(info.estimatedCost)}</span>
                      <span className="text-xs text-slate-500 w-12 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <h3 className="text-sm font-semibold text-blue-400 mb-4">● By Project</h3>
            <div className="space-y-3">
              {topProjectsByCost.slice(0, 5).map((proj) => {
                const pct = totalEstimatedCost > 0 ? (proj.estimatedCost / totalEstimatedCost * 100) : 0;
                return (
                  <div key={proj.path} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 truncate">{proj.name}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-mono text-emerald-400">{formatCost(proj.estimatedCost)}</span>
                      <span className="text-xs text-slate-500 w-12 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <h3 className="text-sm font-semibold text-purple-400 mb-4">● Statistics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Projects</span>
                <span className="text-white font-mono">{projects.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Models</span>
                <span className="text-white font-mono">{sortedModels.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tracked Days</span>
                <span className="text-white font-mono">{dailyCosts.length}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700 mt-2">
                <span className="text-slate-400">Avg/Day</span>
                <span className="text-emerald-400 font-mono">{formatCost(filteredData.avgCostPerDay)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
