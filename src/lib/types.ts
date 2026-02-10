export interface TokenUsage {
  input: number;
  output: number;
  cacheRead?: number;
  cacheCreation?: number;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
  maxOutputTokens: number;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface LongestSession {
  sessionId: string;
  duration: number;
  messageCount: number;
  timestamp: string;
}

export interface StatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: LongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
  totalSpeculationTimeSavedMs: number;
}

export interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  summary: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
  isSidechain: boolean;
}

export interface ModelPricing {
  inputRate: number;
  outputRate: number;
  cacheReadRate?: number;
  cacheCreateRate?: number;
}

export interface ProjectSummary {
  name: string;
  path: string;
  sessionCount: number;
  messageCount: number;
  totalTokens: TokenUsage;
  lastActive: string;
  estimatedCost: number;
}

export interface DashboardData {
  stats: StatsCache;
  projects: ProjectSummary[];
  totalEstimatedCost: number;
  modelBreakdown: Record<string, { tokenUsage: TokenUsage; estimatedCost: number }>;
  generatedAt: string;
  // Granular overview metrics
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  cacheHitRate: number;
  avgCostPerSession: number;
  avgCostPerMessage: number;
  avgTokensPerMessage: number;
  avgMessagesPerSession: number;
  mostActiveHour: string;
  mostActiveDay: string;
  currentStreak: number;
  longestStreak: number;
  dailyCosts: { date: string; cost: number }[];
  recentActivity: DailyActivity[];
  topProjectsByCost: ProjectSummary[];
  topProjectsByMessages: ProjectSummary[];
  activeDays: number;
  totalDays: number;
}

// Token type filter
export type TokenTypeFilter = 'input' | 'output' | 'cacheRead' | 'cacheCreation';

// Filter state interface
export interface FilterState {
  tokenTypes: TokenTypeFilter[];  // Empty array = all types
  models: Set<string>;             // Empty set = all models
  projects: Set<string>;           // Empty set = all projects
  costRange: { min: number | null; max: number | null };
  tokenRange: { min: number | null; max: number | null };
}

// Filtered dashboard data with metadata
export interface FilteredDashboardData extends DashboardData {
  _original: DashboardData;
  activeFilters: FilterState;
  filteredStats: {
    projectsFiltered: number;
    modelsFiltered: number;
    tokensFiltered: number;
    costFiltered: number;
  };
}

// Session Lifecycle Types
export type ServerState = 'STARTING' | 'ACTIVE' | 'IDLE' | 'GRACE_PERIOD' | 'SHUTTING_DOWN';

export interface ActiveSession {
  projectId: string;
  sessionId: string;
  lastActivity: string;
  filePath: string;
}

export interface SessionTrackerState {
  state: ServerState;
  activeSessions: ActiveSession[];
  graceTimer: {
    active: boolean;
    remainingMs: number;
    gracePeriodMs: number;
  };
}

export interface DashboardConfig {
  gracePeriodMs: number;
  sessionIdleTimeoutMs: number;
  autoStart: boolean;
  disableShutdown: boolean;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface PIDLock {
  pid: number;
  port: number;
  startedAt: string;
  lastHeartbeat: string;
}
