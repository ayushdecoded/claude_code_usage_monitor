"use client";

import { useMemo } from "react";
import { format, startOfWeek, startOfMonth, parseISO } from "date-fns";

interface ActivityChartProps {
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
  }>;
  selectedRange: "7D" | "14D" | "30D" | "3M" | "1Y" | "All";
}

type TimeRange = "7D" | "14D" | "30D" | "3M" | "1Y" | "All";

interface AggregatedDataPoint {
  label: string;
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
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
  const niceMax = values.find((v) => v >= maxVal) || maxVal;

  // Pick a nice step that divides niceMax evenly (also 5^m * 2^n)
  // Try 4, 5, or 2 divisions
  const candidates = [4, 5, 2, 8, 10].map((d) => ({ d, step: niceMax / d }));
  // Pick first where step is integer and gives 2-6 ticks
  const best =
    candidates.find((c) => Number.isInteger(c.step) && c.d >= 2 && c.d <= 6) ||
    candidates.find((c) => Number.isInteger(c.step)) ||
    { d: 4, step: niceMax / 4 };

  const ticks: number[] = [];
  for (let i = 0; i <= best.d; i++) {
    ticks.push(Math.round(best.step * i));
  }
  return { niceMax, ticks };
}

export default function ActivityChart({ dailyActivity, selectedRange }: ActivityChartProps) {
  // Aggregate data based on selected range
  const { aggregatedData, totalMessages } = useMemo(() => {
    if (!dailyActivity || dailyActivity.length === 0) {
      return { aggregatedData: [], totalMessages: 0 };
    }

    // Sort by date ascending
    const sorted = [...dailyActivity].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let aggregated: AggregatedDataPoint[] = [];

    // For "All" range, pick aggregation level based on actual data span
    let effectiveRange: TimeRange = selectedRange;
    if (selectedRange === "All" && sorted.length > 0) {
      const earliest = new Date(sorted[0].date);
      const latest = new Date(sorted[sorted.length - 1].date);
      const spanDays = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
      if (spanDays <= 30) effectiveRange = "30D";
      else if (spanDays <= 90) effectiveRange = "3M";
      // else stays "All" (monthly)
    }

    // Aggregate based on range
    if (effectiveRange === "7D" || effectiveRange === "14D" || effectiveRange === "30D") {
      // Daily bars
      aggregated = sorted.map((d) => ({
        label: format(parseISO(d.date), "MMM dd"),
        date: d.date,
        messageCount: d.messageCount,
        sessionCount: d.sessionCount,
        toolCallCount: d.toolCallCount,
      }));
    } else if (effectiveRange === "3M") {
      // Weekly aggregation
      const weekMap = new Map<string, AggregatedDataPoint>();
      sorted.forEach((d) => {
        const date = parseISO(d.date);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
        const weekKey = format(weekStart, "yyyy-MM-dd");
        const weekLabel = `Week of ${format(weekStart, "MMM dd")}`;

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, {
            label: weekLabel,
            date: weekKey,
            messageCount: 0,
            sessionCount: 0,
            toolCallCount: 0,
          });
        }

        const week = weekMap.get(weekKey)!;
        week.messageCount += d.messageCount;
        week.sessionCount += d.sessionCount;
        week.toolCallCount += d.toolCallCount;
      });

      aggregated = Array.from(weekMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } else {
      // Monthly aggregation (1Y or All)
      const monthMap = new Map<string, AggregatedDataPoint>();
      sorted.forEach((d) => {
        const date = parseISO(d.date);
        const monthStart = startOfMonth(date);
        const monthKey = format(monthStart, "yyyy-MM");
        const monthLabel = format(monthStart, "MMM yyyy");

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            label: monthLabel,
            date: monthKey,
            messageCount: 0,
            sessionCount: 0,
            toolCallCount: 0,
          });
        }

        const month = monthMap.get(monthKey)!;
        month.messageCount += d.messageCount;
        month.sessionCount += d.sessionCount;
        month.toolCallCount += d.toolCallCount;
      });

      aggregated = Array.from(monthMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    const total = aggregated.reduce((sum, d) => sum + d.messageCount, 0);

    return { aggregatedData: aggregated, totalMessages: total };
  }, [dailyActivity, selectedRange]);

  // Calculate chart dimensions and scale
  const chartHeight = 280;
  const rawMax = Math.max(...aggregatedData.map((d) => d.messageCount), 1);
  const { niceMax: scaledMax, ticks } = niceScale(rawMax);

  // Hide count labels if too many bars
  const showCountLabels = aggregatedData.length < 30;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
          <span className="text-sm text-slate-400 font-mono transition-all duration-300">
            {totalMessages.toLocaleString()} messages
          </span>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 hover:border-slate-600">
        {aggregatedData.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            No activity data available for this time range.
          </div>
        ) : (
          <>
            {/* Chart with Y-axis */}
            <div className="flex gap-4">
              {/* Y-axis labels */}
              <div className="relative shrink-0" style={{ height: `${chartHeight}px`, width: "48px" }}>
                {ticks.map((tick) => {
                  const bottomPct = (tick / scaledMax) * 100;
                  return (
                    <span
                      key={tick}
                      className="absolute right-0 text-xs text-slate-600 font-mono leading-none transition-all duration-500"
                      style={{ bottom: `${bottomPct}%`, transform: "translateY(50%)" }}
                    >
                      {formatNum(tick)}
                    </span>
                  );
                })}
              </div>

              {/* Bar area — exact height, overflow hidden */}
              <div className="flex-1 relative overflow-hidden" style={{ height: `${chartHeight}px` }}>
                {/* Horizontal grid lines at each tick */}
                {ticks.map((tick) => {
                  const bottomPct = (tick / scaledMax) * 100;
                  return (
                    <div
                      key={tick}
                      className="absolute left-0 right-0 border-b border-slate-700/40 pointer-events-none transition-all duration-500"
                      style={{ bottom: `${bottomPct}%` }}
                    />
                  );
                })}

                <div className="flex items-end gap-1.5 h-full transition-all duration-500">
                  {aggregatedData.map((dataPoint, idx) => {
                    const heightPx =
                      dataPoint.messageCount > 0
                        ? Math.max((dataPoint.messageCount / scaledMax) * chartHeight, 4)
                        : 2;

                    return (
                      <div key={dataPoint.date} className="flex-1 relative group" style={{ height: "100%" }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-200 hover:from-blue-400 hover:to-cyan-300 hover:shadow-lg hover:shadow-blue-500/50 cursor-pointer"
                          style={{
                            height: `${heightPx}px`,
                            opacity: dataPoint.messageCount > 0 ? 1 : 0.12,
                            transition: `height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 40}ms, opacity 0.3s ease, box-shadow 0.3s ease`,
                          }}
                          title={`${dataPoint.label}\n${dataPoint.messageCount} messages\n${dataPoint.sessionCount} sessions\n${dataPoint.toolCallCount} tool calls`}
                        />
                        {/* Count label positioned above bar */}
                        {showCountLabels && dataPoint.messageCount > 0 && (
                          <div
                            className="absolute left-0 right-0 text-center text-xs font-mono font-semibold text-blue-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-all"
                            style={{
                              bottom: `${heightPx + 6}px`,
                              transition: `bottom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 40}ms, opacity 0.3s ease`,
                            }}
                          >
                            {formatNum(dataPoint.messageCount)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X-axis labels — below the chart */}
            <div className="flex gap-4 mt-2">
              <div className="shrink-0" style={{ width: "48px" }} />
              <div className="flex-1 flex gap-1.5">
                {aggregatedData.map((dataPoint) => {
                  return (
                    <div key={dataPoint.date} className="flex-1 text-center">
                      <div className="text-xs text-slate-400 transition-all duration-300">{dataPoint.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
