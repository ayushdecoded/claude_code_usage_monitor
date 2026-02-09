'use client';

import { useMemo } from 'react';
import type { DashboardData } from '@/lib/types';
import ActivityChart from './ActivityChart';

interface ActivityContentProps {
  data: DashboardData;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatDuration(hours: number): string {
  if (hours < 1) return 'Less than an hour';
  if (hours === 1) return '1 hour';
  if (hours < 24) return `${Math.floor(hours)} hours`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day';
  return `${days} days`;
}

export default function ActivityContent({ data }: ActivityContentProps) {
  const stats = data.stats;

  // Helper to format hour to 12-hour time
  function formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  // Helper to format date to DD-MM-YYYY
  function formatDateDDMMYYYY(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Helper to determine color level based on predefined token ranges
  function getTokenColorLevel(tokensForDay: number): { bgColor: string; label: string } {
    if (tokensForDay === 0) {
      return { bgColor: 'transparent', label: 'no activity' };
    } else if (tokensForDay < 1_000_000) {
      return { bgColor: '#a5f3fc', label: 'very less' };
    } else if (tokensForDay < 5_000_000) {
      return { bgColor: '#67e8f9', label: 'less' };
    } else {
      return { bgColor: '#0369a1', label: 'most' };
    }
  }

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalToolCalls = stats.dailyActivity.reduce(
      (sum, day) => sum + day.toolCallCount,
      0
    );

    const avgMessagesPerDay =
      data.activeDays > 0 ? stats.totalMessages / data.activeDays : 0;
    const avgSessionsPerDay =
      data.activeDays > 0 ? stats.totalSessions / data.activeDays : 0;

    // Get hourly data
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: stats.hourCounts[i.toString()] || 0,
    }));
    const maxHourCount = Math.max(...hourlyData.map((h) => h.count), 1);

    // Find peak 2-hour time range
    let peakStartHour = 0;
    let peakEndHour = 1;
    let maxRangeCount = (stats.hourCounts['0'] || 0) + (stats.hourCounts['1'] || 0);

    for (let i = 1; i < 24; i++) {
      const rangeCount = (stats.hourCounts[i.toString()] || 0) +
                         (stats.hourCounts[((i + 1) % 24).toString()] || 0);
      if (rangeCount > maxRangeCount) {
        maxRangeCount = rangeCount;
        peakStartHour = i;
        peakEndHour = (i + 1) % 24;
      }
    }

    // Build month-wise heatmap (current month)
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthHeatmap = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const activity = stats.dailyActivity.find(a => a.date === dateStr);
      return {
        day,
        messageCount: activity?.messageCount || 0,
        sessionCount: activity?.sessionCount || 0,
      };
    });
    const maxMonthActivity = Math.max(...monthHeatmap.map(m => m.messageCount), 1);

    // Build year-wise heatmap (all months in current year)
    const yearHeatmap = Array.from({ length: 12 }, (_, i) => {
      const month = i;
      const monthName = new Date(currentYear, month, 1).toLocaleString('default', { month: 'short' });
      let totalMessages = 0;
      let totalSessions = 0;

      // Sum all days in this month
      const daysInThisMonth = new Date(currentYear, month + 1, 0).getDate();
      for (let day = 1; day <= daysInThisMonth; day++) {
        const dateStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const activity = stats.dailyActivity.find(a => a.date === dateStr);
        if (activity) {
          totalMessages += activity.messageCount;
          totalSessions += activity.sessionCount;
        }
      }

      return {
        month,
        monthName,
        messageCount: totalMessages,
        sessionCount: totalSessions,
      };
    });
    const maxYearActivity = Math.max(...yearHeatmap.map(y => y.messageCount), 1);

    return {
      totalToolCalls,
      avgMessagesPerDay,
      avgSessionsPerDay,
      avgToolCallsPerDay: totalToolCalls / Math.max(data.activeDays, 1),
      avgMessagesPerSession: data.avgMessagesPerSession,
      avgTokensPerMessage: data.avgTokensPerMessage,
      hourlyData,
      maxHourCount,
      peakStartHour,
      peakEndHour,
      peakRangeCount: maxRangeCount,
      monthHeatmap,
      maxMonthActivity,
      yearHeatmap,
      maxYearActivity,
      currentMonth,
      currentYear,
    };
  }, [stats, data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white">Activity Overview</h1>
        <p className="mt-2 text-sm text-slate-400">
          Track your daily activity, sessions, messages, and productivity patterns
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Messages */}
        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Messages</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatNum(stats.totalMessages)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatNum(metrics.avgMessagesPerDay)}/day avg
              </p>
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">💬</div>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Sessions</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatNum(stats.totalSessions)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatNum(metrics.avgSessionsPerDay)}/day avg
              </p>
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">🔄</div>
          </div>
        </div>

        {/* Total Tool Calls */}
        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Tool Calls</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {formatNum(metrics.totalToolCalls)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatNum(metrics.avgToolCallsPerDay)}/day avg
              </p>
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">🔧</div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="group bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Current Streak</p>
              <p className="mt-2 text-3xl font-bold text-orange-400">
                {data.currentStreak} days
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Best: {data.longestStreak} days
              </p>
            </div>
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">🔥</div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <ActivityChart dailyActivity={stats.dailyActivity} selectedRange="30D" />

      {/* Productivity Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Productive Times */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            When You're Most Productive
          </h2>
          <div className="space-y-6">
            {/* Peak Time Range */}
            <div>
              <p className="text-sm text-slate-400 mb-2">Peak Time Range</p>
              <div className="flex items-baseline gap-4">
                <p className="text-4xl font-bold text-blue-400">
                  {formatHour(metrics.peakStartHour)} - {formatHour(metrics.peakEndHour)}
                </p>
                <p className="text-sm text-slate-500">
                  {metrics.peakRangeCount.toLocaleString()} sessions
                </p>
              </div>
            </div>

            {/* Most Active Day */}
            <div>
              <p className="text-sm text-slate-400 mb-2">Most Active Day</p>
              <div className="flex items-baseline gap-4">
                <p className="text-2xl font-bold text-emerald-400">
                  {formatDateDDMMYYYY(data.mostActiveDay)}
                </p>
                <p className="text-sm text-slate-500">
                  {stats.dailyActivity
                    .find((a) => a.date === data.mostActiveDay)
                    ?.messageCount.toLocaleString() || '0'}{' '}
                  messages
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Streak Information */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Streak Status</h2>
          <div className="space-y-6">
            {/* Current Streak */}
            <div>
              <p className="text-sm text-slate-400 mb-3">Current Streak</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((data.currentStreak / data.longestStreak) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-2xl font-bold text-orange-400">
                  {data.currentStreak}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Days in a row</p>
            </div>

            {/* Longest Streak */}
            <div>
              <p className="text-sm text-slate-400 mb-2">Personal Best</p>
              <p className="text-3xl font-bold text-amber-400">{data.longestStreak} days</p>
              <p className="text-xs text-slate-500 mt-1">Longest streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Heatmap */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Activity by Hour of Day</h2>
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {metrics.hourlyData.map((hourData) => {
              const intensity = (hourData.count / metrics.maxHourCount) * 100;
              const displayHour =
                hourData.hour === 0
                  ? '12 AM'
                  : hourData.hour < 12
                    ? `${hourData.hour} AM`
                    : hourData.hour === 12
                      ? '12 PM'
                      : `${hourData.hour - 12} PM`;

              return (
                <div key={hourData.hour} className="flex flex-col items-center gap-2 flex-1 min-w-[3rem]">
                  <div
                    className="w-full rounded transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 cursor-pointer"
                    style={{
                      height: '40px',
                      backgroundColor:
                        intensity === 0
                          ? '#1e293b'
                          : `rgba(59, 130, 246, ${0.2 + intensity * 0.008})`,
                      border:
                        intensity > 0
                          ? `1px solid rgba(59, 130, 246, ${0.5 + intensity * 0.005})`
                          : '1px solid rgba(100, 116, 139, 0.3)',
                    }}
                    title={`${displayHour}: ${hourData.count} sessions`}
                  />
                  <p className="text-xs text-slate-500">{displayHour}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 mt-4">
            Darker blue = more active. Hover for exact counts.
          </p>
        </div>
      </div>

      {/* Year Contribution Graph (GitHub style) */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {(data.totalInputTokens + data.totalOutputTokens) / 1_000_000 < 1
                ? '<1M'
                : `${((data.totalInputTokens + data.totalOutputTokens) / 1_000_000).toFixed(1)}M`
              } tokens in the last year
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels row */}
            <div className="flex gap-1 mb-2 pl-12">
              {Array.from({ length: 53 }).map((_, weekIdx) => {
                const weekDate = new Date(metrics.currentYear, 0, 1 + weekIdx * 7);
                const monthName = weekDate.toLocaleString('default', { month: 'short' });

                // Only show month label at the start of each month
                if (weekIdx === 0 || weekDate.getDate() <= 7) {
                  return (
                    <div key={`month-${weekIdx}`} className="text-xs text-slate-400 font-semibold w-3.5">
                      {monthName}
                    </div>
                  );
                }
                return <div key={`month-${weekIdx}`} className="w-3.5" />;
              })}
            </div>

            {/* Day labels + Grid */}
            <div className="flex gap-1">
              {/* Day of week labels */}
              <div className="flex flex-col gap-1 pr-2">
                <div className="h-3.5 text-xs text-slate-500 font-semibold flex items-center justify-end pr-1"></div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <div
                    key={day}
                    className="h-3.5 w-8 text-xs text-slate-500 font-semibold flex items-center justify-end pr-1"
                  >
                    {/* Only show Mon, Wed, Fri like GitHub */}
                    {idx === 0 || idx === 2 || idx === 4 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Contribution grid */}
              <div className="flex gap-1">
                {Array.from({ length: 53 }).map((_, weekIdx) => {
                  return (
                    <div key={`week-${weekIdx}`} className="flex flex-col gap-1">
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const dayOfYear = weekIdx * 7 + dayIdx;
                        const currentDate = new Date(metrics.currentYear, 0, 1 + dayOfYear);

                        // Check if this date is within the year
                        if (currentDate.getFullYear() !== metrics.currentYear) {
                          return <div key={`empty-${weekIdx}-${dayIdx}`} className="w-3.5 h-3.5" />;
                        }

                        const dateStr = currentDate.toISOString().split('T')[0];
                        const dayTokens = stats.dailyModelTokens.find(d => d.date === dateStr);
                        const tokensForDay = dayTokens
                          ? Object.values(dayTokens.tokensByModel).reduce((sum, t) => sum + t, 0)
                          : 0;
                        const tokensInMillions = tokensForDay / 1_000_000;

                        // Get color based on predefined token ranges
                        const { bgColor, label } = getTokenColorLevel(tokensForDay);

                        const dateDisplay = currentDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });

                        return (
                          <div
                            key={`${weekIdx}-${dayIdx}`}
                            className="w-3.5 h-3.5 rounded-sm transition-all duration-200 hover:ring-1 hover:ring-offset-1 hover:ring-cyan-400 cursor-pointer"
                            style={{
                              backgroundColor: bgColor,
                              border: tokensForDay === 0 ? '1px solid #475569' : 'none',
                            }}
                            title={`${dateDisplay}: ${tokensInMillions < 1 ? '<1M' : tokensInMillions.toFixed(2) + 'M'} tokens (${label})`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 text-xs text-slate-500 mt-6">
          <span className="text-slate-400">Token Usage Scale:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ border: '1px solid #475569' }} />
            <span>None</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#a5f3fc' }} />
            <span>&lt;1M (very less)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#67e8f9' }} />
            <span>1M-5M (less)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#0369a1' }} />
            <span>5M+ (most)</span>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Avg Messages Per Day */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-sm text-slate-400 mb-2">Avg Messages/Day</p>
          <p className="text-3xl font-bold text-white">
            {formatNum(metrics.avgMessagesPerDay)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Over {data.activeDays} active days</p>
        </div>

        {/* Avg Sessions Per Day */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-sm text-slate-400 mb-2">Avg Sessions/Day</p>
          <p className="text-3xl font-bold text-white">
            {formatNum(metrics.avgSessionsPerDay)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Over {data.activeDays} active days</p>
        </div>

        {/* Avg Messages Per Session */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-sm text-slate-400 mb-2">Messages/Session</p>
          <p className="text-3xl font-bold text-white">
            {metrics.avgMessagesPerSession.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Average across all sessions</p>
        </div>

        {/* Total Active Days */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-sm text-slate-400 mb-2">Active Days</p>
          <p className="text-3xl font-bold text-white">{data.activeDays}</p>
          <p className="text-xs text-slate-500 mt-2">
            Out of {data.totalDays} days ({((data.activeDays / data.totalDays) * 100).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-slate-400">First Session</p>
            <p className="text-lg font-semibold text-white mt-1">{formatDateDDMMYYYY(stats.firstSessionDate)}</p>
          </div>
          <div>
            <p className="text-slate-400">Total Activity Span</p>
            <p className="text-lg font-semibold text-white mt-1">{data.totalDays} days</p>
          </div>
          <div>
            <p className="text-slate-400">Activity Frequency</p>
            <p className="text-lg font-semibold text-white mt-1">
              {((data.activeDays / data.totalDays) * 100).toFixed(0)}% active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
