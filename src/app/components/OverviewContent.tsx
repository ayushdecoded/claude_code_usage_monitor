"use client";

import { useState, useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import type { DashboardData } from "@/lib/types";
import { PRICING } from "@/lib/server/pricing";
import ActivityChart from "./ActivityChart";

interface OverviewContentProps {
  data: DashboardData;
}

type TimeRange = "7D" | "14D" | "30D" | "3M" | "1Y" | "All";

// Helper functions
function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM dd");
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

// Find smallest 5^m * 2^n >= maxVal for nice Y-axis scaling
function niceScale(maxVal: number): { niceMax: number; ticks: number[] } {
  if (maxVal <= 0) return { niceMax: 1, ticks: [0, 1] };

  // Generate all 5^m * 2^n values
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

  // Pick a nice step that divides niceMax evenly (also 5^m * 2^n)
  // Try 4, 5, or 2 divisions
  const candidates = [4, 5, 2, 8, 10].map(d => ({ d, step: niceMax / d }));
  // Pick first where step is integer and gives 3-6 ticks
  const best = candidates.find(c => Number.isInteger(c.step) && c.d >= 2 && c.d <= 6)
    || candidates.find(c => Number.isInteger(c.step))
    || { d: 4, step: niceMax / 4 };

  const ticks: number[] = [];
  for (let i = 0; i <= best.d; i++) {
    ticks.push(Math.round(best.step * i));
  }
  return { niceMax, ticks };
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

export default function OverviewContent({ data }: OverviewContentProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("All");

  const {
    stats,
    projects,
    totalEstimatedCost,
    modelBreakdown,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
    cacheHitRate,
    dailyCosts,
    topProjectsByCost,
    topProjectsByMessages,
  } = data;

  // Compute available ranges based on dailyActivity
  const availableRanges = useMemo(() => {
    if (!stats.dailyActivity || stats.dailyActivity.length === 0) {
      return new Set<TimeRange>(["All"]);
    }
    const sorted = [...stats.dailyActivity].sort((a, b) => a.date.localeCompare(b.date));
    const earliest = new Date(sorted[0].date);
    const now = new Date();
    const daySpan = Math.ceil((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
    const available = new Set<TimeRange>();
    if (daySpan >= 7) available.add("7D");
    if (daySpan >= 14) available.add("14D");
    if (daySpan >= 30) available.add("30D");
    if (daySpan >= 90) available.add("3M");
    if (daySpan >= 365) available.add("1Y");
    available.add("All");
    return available;
  }, [stats.dailyActivity]);

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    // "All" range: use exact pre-computed values from server
    if (selectedRange === "All") {
      return {
        filteredActivity: stats.dailyActivity,
        totalMessages: stats.totalMessages,
        totalSessions: stats.totalSessions,
        totalTokensFiltered: totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheCreationTokens,
        totalCost: totalEstimatedCost,
        avgCostPerSession: data.avgCostPerSession,
        avgCostPerMessage: data.avgCostPerMessage,
        avgTokensPerMessage: data.avgTokensPerMessage,
        avgMessagesPerSession: data.avgMessagesPerSession,
        mostActiveDay: data.mostActiveDay,
        activeDays: data.activeDays,
        totalDays: data.totalDays,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
      };
    }

    const now = new Date();
    let cutoffDate: Date;

    if (selectedRange === "7D") {
      cutoffDate = subDays(now, 7);
    } else if (selectedRange === "14D") {
      cutoffDate = subDays(now, 14);
    } else if (selectedRange === "30D") {
      cutoffDate = subDays(now, 30);
    } else if (selectedRange === "3M") {
      cutoffDate = subDays(now, 90);
    } else {
      cutoffDate = subDays(now, 365);
    }

    // Filter dailyActivity — these values are accurate
    const filteredActivity = stats.dailyActivity.filter((d) => new Date(d.date) >= cutoffDate);
    const totalMessages = filteredActivity.reduce((sum, d) => sum + d.messageCount, 0);
    const totalSessions = filteredActivity.reduce((sum, d) => sum + d.sessionCount, 0);

    // Filter dailyModelTokens to compute proportion for scaling
    // dailyModelTokens.tokensByModel only tracks non-cache tokens (input+output)
    // We use the proportion of filtered vs all-time to scale the accurate all-time totals
    const filteredModelTokens = stats.dailyModelTokens.filter((d) => new Date(d.date) >= cutoffDate);
    const filteredDailyTokenSum = filteredModelTokens.reduce((sum, d) => {
      return sum + Object.values(d.tokensByModel).reduce((acc, val) => acc + val, 0);
    }, 0);
    const allTimeDailyTokenSum = stats.dailyModelTokens.reduce((sum, d) => {
      return sum + Object.values(d.tokensByModel).reduce((acc, val) => acc + val, 0);
    }, 0);

    // Proportion: ratio of filtered non-cache tokens to all-time non-cache tokens
    // Used to scale all-time totals (since dailyModelTokens only has non-cache tokens)
    const proportion = allTimeDailyTokenSum > 0 ? filteredDailyTokenSum / allTimeDailyTokenSum : 0;

    // Scale accurate all-time token total by proportion
    const allTimeTokens = totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheCreationTokens;
    const totalTokensFiltered = Math.round(allTimeTokens * proportion);

    // Cost: Scale the filtered totalEstimatedCost by the time proportion
    // Note: dailyCosts from server only include non-cache costs, so we can't use them directly
    // when token filters are active. Instead, we scale the already-filtered totalEstimatedCost.
    const finalCost = totalEstimatedCost * proportion;

    // Compute averages
    const avgCostPerSession = totalSessions > 0 ? finalCost / totalSessions : 0;
    const avgCostPerMessage = totalMessages > 0 ? finalCost / totalMessages : 0;
    const avgTokensPerMessage = totalMessages > 0 ? totalTokensFiltered / totalMessages : 0;
    const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

    // Most active day in filtered range
    const mostActiveDay =
      filteredActivity.length > 0
        ? filteredActivity.reduce((max, d) => (d.messageCount > max.messageCount ? d : max)).date
        : "N/A";

    // Active days
    const activeDays = filteredActivity.filter((d) => d.messageCount > 0).length;

    // Compute streaks from filtered data
    const sortedDates = filteredActivity
      .filter((d) => d.messageCount > 0)
      .map((d) => d.date)
      .sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.round(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    // Current streak: check if most recent date is today or yesterday
    if (sortedDates.length > 0) {
      const mostRecentDate = new Date(sortedDates[sortedDates.length - 1]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      mostRecentDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 1) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
      }
    }

    // Total days in filtered range (sort to ensure correct first/last)
    const sortedActivity = [...filteredActivity].sort((a, b) => a.date.localeCompare(b.date));
    const totalDays =
      sortedActivity.length > 0
        ? Math.ceil(
            (new Date(sortedActivity[sortedActivity.length - 1].date).getTime() -
              new Date(sortedActivity[0].date).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        : 0;

    return {
      filteredActivity,
      totalMessages,
      totalSessions,
      totalTokensFiltered,
      totalCost: finalCost,
      avgCostPerSession,
      avgCostPerMessage,
      avgTokensPerMessage,
      avgMessagesPerSession,
      mostActiveDay,
      activeDays,
      totalDays,
      currentStreak,
      longestStreak,
    };
  }, [selectedRange, stats.dailyActivity, stats.dailyModelTokens, dailyCosts, totalInputTokens, totalOutputTokens, totalCacheReadTokens, totalCacheCreationTokens, totalEstimatedCost, data, stats.totalMessages, stats.totalSessions]);

  const totalTokens = totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheCreationTokens;
  const sortedModels = Object.entries(modelBreakdown).sort((a, b) => b[1].estimatedCost - a[1].estimatedCost);

  // For visualizations
  const maxTopProjectMessages = Math.max(...topProjectsByMessages.slice(0, 5).map(p => p.messageCount), 1);

  const ranges: TimeRange[] = ["7D", "14D", "30D", "3M", "1Y", "All"];

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Overview</h2>
        <div className="flex gap-2">
          {ranges.map((range) => {
            const disabled = !availableRanges.has(range);
            return (
              <button
                key={range}
                onClick={() => !disabled && setSelectedRange(range)}
                disabled={disabled}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${
                  disabled
                    ? "bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-40"
                    : selectedRange === range
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105"
                    : "bg-slate-700/60 text-slate-400 hover:bg-slate-600 hover:text-slate-300"
                }`}
              >
                {range}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono transition-all duration-300">{formatCost(filteredData.totalCost)}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Total Tokens</p>
          <p className="text-3xl font-bold text-white font-mono transition-all duration-300">{formatTokens(filteredData.totalTokensFiltered)}</p>
          <div className="mt-3 pt-3 border-t border-slate-700 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Sessions</span>
              <span className="text-slate-400 font-mono transition-all duration-300">{filteredData.totalSessions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Messages</span>
              <span className="text-slate-400 font-mono transition-all duration-300">{filteredData.totalMessages.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Total Sessions</p>
          <p className="text-3xl font-bold text-white font-mono transition-all duration-300">{filteredData.totalSessions.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Total Messages</p>
          <p className="text-3xl font-bold text-white font-mono transition-all duration-300">{filteredData.totalMessages.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Cache Hit Rate</p>
          <p className="text-3xl font-bold text-blue-400 font-mono transition-all duration-300">{cacheHitRate.toFixed(1)}%</p>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(cacheHitRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Averages & Insights Row */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Averages</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Avg Cost / Session</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono transition-all duration-300">{formatCost(filteredData.avgCostPerSession)}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Avg Cost / Message</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono transition-all duration-300">{formatCost(filteredData.avgCostPerMessage)}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Avg Tokens / Message</p>
            <p className="text-2xl font-bold text-blue-400 font-mono transition-all duration-300">{formatTokens(filteredData.avgTokensPerMessage)}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Avg Messages / Session</p>
            <p className="text-2xl font-bold text-white font-mono transition-all duration-300">{filteredData.avgMessagesPerSession.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* 3. Activity Insights Row */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Activity Insights</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Most Active Hour</p>
            <p className="text-2xl font-bold text-white transition-all duration-300">{data.mostActiveHour}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Most Active Day</p>
            <p className="text-2xl font-bold text-white transition-all duration-300">{formatDate(filteredData.mostActiveDay)}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Current Streak</p>
            <p className="text-2xl font-bold text-orange-400 transition-all duration-300">
              <span className="inline-block mr-2">▇</span>
              {filteredData.currentStreak} days
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Active Days</p>
            <p className="text-2xl font-bold text-white transition-all duration-300">
              {filteredData.activeDays} <span className="text-slate-500 text-lg">/ {filteredData.totalDays}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4. Model Breakdown */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Model Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sortedModels.map(([model, info]) => {
            // Calculate total tokens from the normalized modelBreakdown
            const modelTotal = info.tokenUsage.input + info.tokenUsage.output + (info.tokenUsage.cacheRead || 0) + (info.tokenUsage.cacheCreation || 0);
            const costPct = totalEstimatedCost > 0 ? (info.estimatedCost / totalEstimatedCost * 100) : 0;
            const tokenPct = totalTokens > 0 ? (modelTotal / totalTokens * 100) : 0;
            const perMTokRate = modelTotal > 0 ? (info.estimatedCost / (modelTotal / 1_000_000)) : 0;
            const maxToken = Math.max(info.tokenUsage.input, info.tokenUsage.output, info.tokenUsage.cacheRead || 0, info.tokenUsage.cacheCreation || 0, 1);

            // Per-token-type cost using dynamic PRICING rates
            // model is already normalized (family name like "opus", "sonnet", "haiku")
            const pricing = PRICING[model as keyof typeof PRICING] || PRICING.sonnet;
            const rates = {
              input: pricing.inputRate,
              output: pricing.outputRate,
              cacheRead: pricing.cacheReadRate,
              cacheWrite: pricing.cacheCreateRate,
            };

            const inputCost = (info.tokenUsage.input / 1_000_000) * rates.input;
            const outputCost = (info.tokenUsage.output / 1_000_000) * rates.output;
            const cacheReadCost = ((info.tokenUsage.cacheRead || 0) / 1_000_000) * (rates.cacheRead || 0);
            const cacheWriteCost = ((info.tokenUsage.cacheCreation || 0) / 1_000_000) * (rates.cacheWrite || 0);

            const tokenBreakdown = [
              { label: 'Input', value: info.tokenUsage.input, cost: inputCost, rate: rates.input, color: '#3B82F6' },
              { label: 'Output', value: info.tokenUsage.output, cost: outputCost, rate: rates.output, color: '#A855F7' },
              { label: 'Cache Read', value: info.tokenUsage.cacheRead || 0, cost: cacheReadCost, rate: rates.cacheRead, color: '#10B981' },
              { label: 'Cache Write', value: info.tokenUsage.cacheCreation || 0, cost: cacheWriteCost, rate: rates.cacheWrite, color: '#F59E0B' },
            ];

            const maxCostInModel = Math.max(...tokenBreakdown.map(t => t.cost), 0.01);

            // Cost composition segments for stacked bar
            const costSegments = tokenBreakdown.filter(t => t.cost > 0).map(t => ({
              ...t, pct: (t.cost / info.estimatedCost) * 100
            }));

            return (
              <div key={model} className="relative rounded-2xl overflow-hidden bg-slate-800/80 border border-slate-700/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/60">
                {/* Accent gradient top border */}
                <div className="h-1" style={{ background: `linear-gradient(to right, ${modelColor(model)}, ${modelColor(model)}66)` }} />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${modelColor(model)}20` }}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: modelColor(model), boxShadow: `0 0 12px ${modelColor(model)}60` }} />
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${modelTextClass(model)}`}>{prettifyModel(model)}</h3>
                        <p className="text-xs text-slate-500">{tokenPct.toFixed(1)}% of all tokens</p>
                      </div>
                    </div>
                  </div>

                  {/* Big numbers */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-slate-900/50 rounded-xl p-3.5">
                      <p className="text-xs text-slate-500 mb-1">Tokens</p>
                      <p className="text-xl font-bold text-white font-mono tracking-tight transition-all duration-300">{formatTokens(modelTotal)}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3.5">
                      <p className="text-xs text-slate-500 mb-1">Total Cost</p>
                      <p className="text-xl font-bold text-emerald-400 font-mono tracking-tight transition-all duration-300">{formatCost(info.estimatedCost)}</p>
                    </div>
                  </div>

                  {/* Cost composition stacked bar */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">Cost breakdown</span>
                      <span className="font-mono font-medium" style={{ color: modelColor(model) }}>{costPct.toFixed(1)}% of total</span>
                    </div>
                    <div className="h-3 bg-slate-900/40 rounded-lg overflow-hidden flex">
                      {costSegments.map((seg) => (
                        <div
                          key={seg.label}
                          className="h-full first:rounded-l-lg last:rounded-r-lg transition-all duration-500"
                          style={{ width: `${Math.max(seg.pct, seg.cost > 0 ? 1 : 0)}%`, backgroundColor: seg.color }}
                          title={`${seg.label}: ${formatCost(seg.cost)} (${seg.pct.toFixed(1)}%)`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Token + Cost breakdown rows */}
                  <div className="space-y-3">
                    {tokenBreakdown.map((t) => {
                      const costBarPct = (t.cost / maxCostInModel) * 100;
                      const costPctOfModel = info.estimatedCost > 0 ? (t.cost / info.estimatedCost) * 100 : 0;
                      return (
                        <div key={t.label} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                              <span className="text-xs text-slate-400">{t.label}</span>
                              <span className="text-xs text-slate-600 font-mono">${t.rate}/MTok</span>
                            </div>
                            <div className="flex items-baseline gap-3">
                              <span className="text-xs text-slate-500 font-mono">{formatTokens(t.value)}</span>
                              <span className="text-xs text-emerald-400 font-mono font-medium w-16 text-right">{formatCost(t.cost)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-900/40 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.max(costBarPct, t.cost > 0 ? 2 : 0)}%`, backgroundColor: `${t.color}80` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Top Projects (2 columns) */}
      {(topProjectsByMessages.length > 0 || projects.length > 0) && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Top Projects</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top by Messages */}
            {topProjectsByMessages.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
                <h3 className="text-sm font-semibold text-blue-400 mb-4">● Top by Messages</h3>
                <div className="space-y-3">
                  {topProjectsByMessages.slice(0, 5).map((proj, idx) => {
                    const widthPct = (proj.messageCount / maxTopProjectMessages) * 100;
                    return (
                      <div key={proj.path}>
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-xs text-slate-500 font-mono w-5 shrink-0 mt-0.5">#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <span className="text-sm text-white truncate flex-1 mr-2">{proj.name}</span>
                              <span className="text-xs text-slate-400 font-mono">{proj.messageCount.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 truncate">{proj.path}</p>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden ml-7">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                            style={{ width: `${widthPct}%`, transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 100}ms` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top by Sessions */}
            {projects.length > 0 && (() => {
              const topBySessions = [...projects]
                .sort((a, b) => b.sessionCount - a.sessionCount)
                .slice(0, 5);
              const maxSessions = Math.max(...topBySessions.map(p => p.sessionCount), 1);

              return (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
                  <h3 className="text-sm font-semibold text-purple-400 mb-4">● Top by Sessions</h3>
                  <div className="space-y-3">
                    {topBySessions.map((proj, idx) => {
                      const widthPct = (proj.sessionCount / maxSessions) * 100;
                      return (
                        <div key={proj.path}>
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-xs text-slate-500 font-mono w-5 shrink-0 mt-0.5">#{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <span className="text-sm text-white truncate flex-1 mr-2">{proj.name}</span>
                                <span className="text-xs text-purple-400 font-mono">{proj.sessionCount.toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-600 truncate">{proj.path}</p>
                            </div>
                          </div>
                          <div className="h-3 bg-slate-700 rounded-full overflow-hidden ml-7">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                              style={{ width: `${widthPct}%`, transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 100}ms` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 6. Recent Activity */}
      <ActivityChart dailyActivity={filteredData.filteredActivity} selectedRange={selectedRange} />

      {/* 7. Token Distribution */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Token Distribution</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          {(() => {
            // Aggregate per-token-type costs across all models using actual model rates
            let inputCost = 0;
            let outputCost = 0;
            let cacheReadCost = 0;
            let cacheCreationCost = 0;

            for (const [model, info] of Object.entries(modelBreakdown)) {
              const usage = stats.modelUsage[model];
              if (!usage) continue;

              const m = model.toLowerCase();
              const rates = m.includes('opus')
                ? { input: 5, output: 25, cacheRead: 0.50, cacheWrite: 6.25 }
                : m.includes('haiku')
                ? { input: 1, output: 5, cacheRead: 0.10, cacheWrite: 1.25 }
                : { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 };

              inputCost += (usage.inputTokens / 1_000_000) * rates.input;
              outputCost += (usage.outputTokens / 1_000_000) * rates.output;
              cacheReadCost += (usage.cacheReadInputTokens / 1_000_000) * rates.cacheRead;
              cacheCreationCost += (usage.cacheCreationInputTokens / 1_000_000) * rates.cacheWrite;
            }

            const maxTokenCount = Math.max(totalInputTokens, totalOutputTokens, totalCacheReadTokens, totalCacheCreationTokens, 1);
            const maxCost = Math.max(inputCost, outputCost, cacheReadCost, cacheCreationCost, 0.01);

            const tokenTypes = [
              { label: 'Input', count: totalInputTokens, cost: inputCost, color: 'bg-blue-500', dotColor: 'bg-blue-400' },
              { label: 'Output', count: totalOutputTokens, cost: outputCost, color: 'bg-purple-500', dotColor: 'bg-purple-400' },
              { label: 'Cache Read', count: totalCacheReadTokens, cost: cacheReadCost, color: 'bg-emerald-500', dotColor: 'bg-emerald-400' },
              { label: 'Cache Creation', count: totalCacheCreationTokens, cost: cacheCreationCost, color: 'bg-amber-500', dotColor: 'bg-amber-400' },
            ];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Token Volume (bars scaled to max token type) */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-4">By Volume</h3>
                  <div className="space-y-4">
                    {tokenTypes.map((type) => {
                      const barPct = (type.count / maxTokenCount) * 100;
                      const pctOfTotal = totalTokens > 0 ? ((type.count / totalTokens) * 100) : 0;
                      return (
                        <div key={type.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-sm ${type.dotColor}`} />
                              <span className="text-sm text-slate-300">{type.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm text-white font-mono font-medium">{formatTokens(type.count)}</span>
                              <span className="text-xs text-slate-500 w-12 text-right">{pctOfTotal.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-4 bg-slate-700/50 rounded overflow-hidden">
                            <div
                              className={`h-full ${type.color} rounded`}
                              style={{ width: `${Math.max(barPct, type.count > 0 ? 2 : 0)}%`, transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1)` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cost Contribution (bars scaled to max cost) */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-4">By Cost</h3>
                  <div className="space-y-4">
                    {tokenTypes.map((type) => {
                      const barPct = (type.cost / maxCost) * 100;
                      const pctOfTotalCost = totalEstimatedCost > 0 ? ((type.cost / totalEstimatedCost) * 100) : 0;
                      return (
                        <div key={type.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-sm ${type.dotColor}`} />
                              <span className="text-sm text-slate-300">{type.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm text-emerald-400 font-mono font-medium">{formatCost(type.cost)}</span>
                              <span className="text-xs text-slate-500 w-12 text-right">{pctOfTotalCost.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-4 bg-slate-700/50 rounded overflow-hidden">
                            <div
                              className="h-full bg-emerald-500/70 rounded"
                              style={{ width: `${Math.max(barPct, type.cost > 0 ? 2 : 0)}%`, transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1)` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
