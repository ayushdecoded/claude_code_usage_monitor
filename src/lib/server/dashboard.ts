import type { DashboardData, TokenUsage, DailyActivity, ProjectSummary } from '@/lib/types';
import { parseStatsCache, parseAllSessionsIndex } from './parsers';
import { calculateCost } from './pricing';
import { sseManager } from './sse-manager';
import { metricsTracker, type AggregateMetrics } from './performance/metrics-tracker';

// In-memory store — holds current data, updated incrementally by file watcher
let cachedData: DashboardData | null = null;
let initializationPromise: Promise<void> | null = null;

export async function initializeDataStore(): Promise<void> {
  // If already initialized, return immediately
  if (cachedData) return;

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  // Start initialization
  console.log('[DataStore] Initializing...');
  initializationPromise = refreshData();

  try {
    await initializationPromise;
  } catch (error) {
    console.error('[DataStore] Failed to refresh data:', error);
    initializationPromise = null; // Reset on error to allow retry
    throw error;
  }
}

// Called by watcher when files change
export async function invalidateCache(changedFile?: string): Promise<void> {
  console.log('[DataStore] Cache invalidated, refreshing...', changedFile ? `(file: ${changedFile})` : '');
  await refreshData(changedFile);
}

export async function getDashboardData(): Promise<DashboardData> {
  // Auto-initialize if not done yet (handles build-time SSG)
  if (!cachedData) {
    await initializeDataStore();
  }
  if (!cachedData) {
    throw new Error('Failed to initialize data store - cachedData is still null after initialization');
  }
  return cachedData;
}

async function refreshData(changedFile?: string): Promise<void> {
  console.log('[DataStore] Starting refreshData...');

  let stats: Awaited<ReturnType<typeof parseStatsCache>>;
  let projects: Awaited<ReturnType<typeof parseAllSessionsIndex>>;
  try {
    [stats, projects] = await Promise.all([
      parseStatsCache(),
      parseAllSessionsIndex(changedFile), // Pass changedFile for incremental updates
    ]);
    console.log('[DataStore] Parsed data - stats:', !!stats, 'projects:', projects?.length ?? 0);
  } catch (error) {
    console.error('[DataStore] Parser error (using empty data):', error);
    stats = null;
    projects = [];
  }

  const emptyStats = {
    version: 0, lastComputedDate: '', dailyActivity: [], dailyModelTokens: [],
    modelUsage: {}, totalSessions: 0, totalMessages: 0,
    longestSession: { sessionId: '', duration: 0, messageCount: 0, timestamp: '' },
    firstSessionDate: '', hourCounts: {}, totalSpeculationTimeSavedMs: 0,
  };

  const s = stats || emptyStats;
  const projectsList = projects || [];

  // Normalize model names (group variants of same model together)
  const normalizeModelName = (model: string): string => {
    const lower = model.toLowerCase();
    if (lower.includes('opus')) return 'claude-opus-4.5';
    if (lower.includes('sonnet')) return 'claude-sonnet-4.5';
    if (lower.includes('haiku')) return 'claude-haiku-4.5';
    return model;
  };

  // Build model breakdown from stats-cache (may be stale)
  // Aggregate by normalized model name to handle variant spellings
  const modelBreakdown: Record<string, { tokenUsage: TokenUsage; estimatedCost: number }> = {};

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;

  for (const [model, usage] of Object.entries(s.modelUsage)) {
    const normalizedModel = normalizeModelName(model);
    const tokens: TokenUsage = {
      input: usage.inputTokens,
      output: usage.outputTokens,
      cacheRead: usage.cacheReadInputTokens,
      cacheCreation: usage.cacheCreationInputTokens,
    };
    const cost = calculateCost(tokens, normalizedModel);

    // Aggregate if model already exists
    if (modelBreakdown[normalizedModel]) {
      modelBreakdown[normalizedModel].tokenUsage.input += tokens.input;
      modelBreakdown[normalizedModel].tokenUsage.output += tokens.output;
      modelBreakdown[normalizedModel].tokenUsage.cacheRead = (modelBreakdown[normalizedModel].tokenUsage.cacheRead || 0) + (tokens.cacheRead || 0);
      modelBreakdown[normalizedModel].tokenUsage.cacheCreation = (modelBreakdown[normalizedModel].tokenUsage.cacheCreation || 0) + (tokens.cacheCreation || 0);
      modelBreakdown[normalizedModel].estimatedCost += cost;
    } else {
      modelBreakdown[normalizedModel] = { tokenUsage: tokens, estimatedCost: cost };
    }

    totalInputTokens += usage.inputTokens;
    totalOutputTokens += usage.outputTokens;
    totalCacheReadTokens += usage.cacheReadInputTokens;
    totalCacheCreationTokens += usage.cacheCreationInputTokens;
  }

  // Use sum of per-project costs and tokens as source of truth (more accurate than stats-cache)
  const totalEstimatedCost = projectsList.reduce((sum, p) => sum + p.estimatedCost, 0);

  // Aggregate tokens from projects (override potentially stale stats-cache values)
  totalInputTokens = projectsList.reduce((sum, p) => sum + p.totalTokens.input, 0);
  totalOutputTokens = projectsList.reduce((sum, p) => sum + p.totalTokens.output, 0);
  totalCacheReadTokens = projectsList.reduce((sum, p) => sum + (p.totalTokens.cacheRead || 0), 0);
  totalCacheCreationTokens = projectsList.reduce((sum, p) => sum + (p.totalTokens.cacheCreation || 0), 0);

  // Cache hit rate
  const totalCacheableTokens = totalInputTokens + totalCacheReadTokens + totalCacheCreationTokens;
  const cacheHitRate = totalCacheableTokens > 0 ? (totalCacheReadTokens / totalCacheableTokens) * 100 : 0;

  // Averages
  const avgCostPerSession = s.totalSessions > 0 ? totalEstimatedCost / s.totalSessions : 0;
  const avgCostPerMessage = s.totalMessages > 0 ? totalEstimatedCost / s.totalMessages : 0;
  const totalAllTokens = totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheCreationTokens;
  const avgTokensPerMessage = s.totalMessages > 0 ? totalAllTokens / s.totalMessages : 0;
  const avgMessagesPerSession = s.totalSessions > 0 ? s.totalMessages / s.totalSessions : 0;

  // Most active hour
  let mostActiveHour = '12:00 PM';
  let maxHourCount = 0;
  for (const [hour, count] of Object.entries(s.hourCounts)) {
    if (count > maxHourCount) {
      maxHourCount = count;
      const h = parseInt(hour);
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      mostActiveHour = `${displayHour}:00 ${period}`;
    }
  }

  // Most active day
  let mostActiveDay = '';
  let maxDayMessages = 0;
  for (const activity of s.dailyActivity) {
    if (activity.messageCount > maxDayMessages) {
      maxDayMessages = activity.messageCount;
      mostActiveDay = activity.date;
    }
  }

  // Streaks
  const sortedActivity = [...s.dailyActivity].sort((a, b) => a.date.localeCompare(b.date));
  const activityDates = new Set(sortedActivity.map(a => a.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Current streak
  let currentStreak = 0;
  const startDate = activityDates.has(todayStr) ? today : activityDates.has(yesterdayStr) ? yesterday : null;
  if (startDate) {
    const checkDate = new Date(startDate);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (!activityDates.has(dateStr)) break;
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;
  for (const activity of sortedActivity) {
    const currDate = new Date(activity.date);
    currDate.setHours(0, 0, 0, 0);

    if (!prevDate) {
      tempStreak = 1;
    } else {
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    prevDate = currDate;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Compute effective cost-per-token rate per model using accurate all-time data
  // dailyModelTokens.tokensByModel tracks non-cache tokens (input+output) per model per day
  // We use the ratio of accurate all-time cost to all-time non-cache tokens to derive daily costs
  const effectiveRatePerToken: Record<string, number> = {};
  for (const [model, usage] of Object.entries(s.modelUsage)) {
    const nonCacheTokens = usage.inputTokens + usage.outputTokens;
    const cost = modelBreakdown[model]?.estimatedCost || 0;
    effectiveRatePerToken[model] = nonCacheTokens > 0 ? cost / nonCacheTokens : 0;
  }

  const dailyCosts: { date: string; cost: number }[] = [];
  for (const dayTokens of s.dailyModelTokens) {
    let dayCost = 0;
    for (const [model, tokens] of Object.entries(dayTokens.tokensByModel)) {
      // Find matching model key (dailyModelTokens may use different model ID format)
      let rate = effectiveRatePerToken[model];
      if (rate === undefined) {
        // Try fuzzy match
        const m = model.toLowerCase();
        for (const [key, r] of Object.entries(effectiveRatePerToken)) {
          if (m.includes('opus') && key.toLowerCase().includes('opus')) { rate = r; break; }
          if (m.includes('sonnet') && key.toLowerCase().includes('sonnet')) { rate = r; break; }
          if (m.includes('haiku') && key.toLowerCase().includes('haiku')) { rate = r; break; }
        }
      }
      dayCost += tokens * (rate || 0);
    }
    dailyCosts.push({ date: dayTokens.date, cost: dayCost });
  }

  // Recent activity (last 14 days)
  const recentActivity: DailyActivity[] = [...s.dailyActivity]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  // Top projects by cost and messages
  const topProjectsByCost: ProjectSummary[] = [...projectsList]
    .sort((a, b) => b.estimatedCost - a.estimatedCost)
    .slice(0, 5);

  const topProjectsByMessages: ProjectSummary[] = [...projectsList]
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);

  // Active days and total days
  const activeDays = activityDates.size;
  let totalDays = 0;
  if (s.firstSessionDate) {
    const firstDate = new Date(s.firstSessionDate);
    firstDate.setHours(0, 0, 0, 0);
    totalDays = Math.max(1, Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  const result: DashboardData = {
    stats: s,
    projects: projectsList,
    totalEstimatedCost,
    modelBreakdown,
    generatedAt: new Date().toISOString(),
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
    cacheHitRate,
    avgCostPerSession,
    avgCostPerMessage,
    avgTokensPerMessage,
    avgMessagesPerSession,
    mostActiveHour,
    mostActiveDay,
    currentStreak,
    longestStreak,
    dailyCosts,
    recentActivity,
    topProjectsByCost,
    topProjectsByMessages,
    activeDays,
    totalDays,
  };

  cachedData = result;
  console.log('[DataStore] Data refreshed successfully. Projects count:', projectsList.length);

  // Broadcast to all connected SSE clients
  sseManager.broadcast('data-refresh', { type: 'full', timestamp: Date.now() });
}

/**
 * Returns performance metrics for monitoring and debugging.
 */
export function getPerformanceMetrics(): AggregateMetrics & { memory: ReturnType<typeof metricsTracker.getMemoryUsage> } {
  return {
    ...metricsTracker.getAggregateMetrics(),
    memory: metricsTracker.getMemoryUsage(),
  };
}
