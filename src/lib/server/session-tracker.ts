import { loadConfig } from './config';
import type { ServerState, ActiveSession, SessionTrackerState, DashboardConfig } from '../types';

interface SessionInfo {
  projectId: string;
  sessionId: string;
  lastActivity: number;
  filePath: string;
}

export class SessionTracker {
  private sessions = new Map<string, SessionInfo>();
  private state: ServerState = 'STARTING';
  private graceTimer: NodeJS.Timeout | null = null;
  private graceStartTime: number | null = null;
  private config: DashboardConfig;
  private checkStateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = loadConfig();
    this.checkStateInterval = setInterval(() => this.checkState(), 5000);
    console.log('[SessionTracker] Initialized with config:', {
      gracePeriodMs: this.config.gracePeriodMs,
      sessionIdleTimeoutMs: this.config.sessionIdleTimeoutMs,
      disableShutdown: this.config.disableShutdown,
    });
  }

  // Public API
  onFileChange(filePath: string): void {
    const sessionInfo = this.extractSessionInfo(filePath);
    if (!sessionInfo) {
      return;
    }

    const key = `${sessionInfo.projectId}:${sessionInfo.sessionId}`;
    const now = Date.now();

    this.sessions.set(key, {
      ...sessionInfo,
      lastActivity: now,
      filePath,
    });

    if (this.config.logLevel === 'debug') {
      console.debug('[SessionTracker] Session activity:', {
        projectId: sessionInfo.projectId,
        sessionId: sessionInfo.sessionId,
      });
    }

    // If we're in grace period, cancel it
    if (this.state === 'GRACE_PERIOD') {
      this.cancelGracePeriod();
      this.transitionTo('ACTIVE');
    }
  }

  getActiveSessions(): ActiveSession[] {
    return Array.from(this.sessions.values()).map(s => ({
      projectId: s.projectId,
      sessionId: s.sessionId,
      lastActivity: new Date(s.lastActivity).toISOString(),
      filePath: s.filePath,
    }));
  }

  getState(): SessionTrackerState {
    const gracePeriodMs = this.config.gracePeriodMs;
    const remainingMs = this.graceTimer && this.graceStartTime
      ? Math.max(0, gracePeriodMs - (Date.now() - this.graceStartTime))
      : 0;

    return {
      state: this.state,
      activeSessions: this.getActiveSessions(),
      graceTimer: {
        active: this.graceTimer !== null,
        remainingMs,
        gracePeriodMs,
      },
    };
  }

  // State transitions
  private transitionTo(newState: ServerState): void {
    if (this.state !== newState) {
      console.log(`[SessionTracker] State: ${this.state} → ${newState}`);
      this.state = newState;
    }
  }

  private startGracePeriod(): void {
    this.cancelGracePeriod();

    const gracePeriodMs = this.config.gracePeriodMs;
    this.graceStartTime = Date.now();

    console.log(`[SessionTracker] ⏱️  Grace period started (${gracePeriodMs / 60000}m)`);
    this.transitionTo('GRACE_PERIOD');

    this.graceTimer = setTimeout(() => {
      this.initiateShutdown();
    }, gracePeriodMs);
  }

  private cancelGracePeriod(): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
      this.graceStartTime = null;
      console.log('[SessionTracker] 🔄 Grace period cancelled (new activity)');
    }
  }

  private async initiateShutdown(): Promise<void> {
    if (this.config.disableShutdown) {
      console.log('[SessionTracker] ⚠️  Shutdown disabled (dev mode)');
      return;
    }

    console.log('[SessionTracker] 🛑 Initiating graceful shutdown...');
    this.transitionTo('SHUTTING_DOWN');

    try {
      // 1. Close SSE connections
      const { sseManager } = await import('./sse-manager');
      console.log('[SessionTracker] Closing SSE connections...');
      sseManager.broadcast('server-shutdown', { reason: 'grace_period_expired' });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow message delivery

      // 2. Release PID lock
      console.log('[SessionTracker] Releasing PID lock...');
      const { pidManager } = await import('./pid-manager');
      await pidManager.release();

      // 3. Final log
      console.log('[SessionTracker] ✓ Shutdown complete');
    } catch (error) {
      console.error('[SessionTracker] Shutdown error:', error);
    } finally {
      // Exit regardless of errors
      setTimeout(() => process.exit(0), 2000);
    }
  }

  // Session management
  private extractSessionInfo(filePath: string): { projectId: string; sessionId: string } | null {
    // Expected format: ~/.claude/projects/{projectId}/sessions/{sessionId}.jsonl
    // Or: C:\Users\...\.claude\projects\{projectId}\sessions\{sessionId}.jsonl

    const normalizedPath = filePath.replace(/\\/g, '/');

    // Match pattern: .claude/projects/{projectId}/sessions/{sessionId}.jsonl
    const match = normalizedPath.match(/\.claude[\/\\]projects[\/\\]([^\/\\]+)[\/\\](?:sessions[\/\\])?([^\/\\]+)\.jsonl$/);

    if (!match) {
      return null;
    }

    const [, projectId, sessionId] = match;

    // Skip sessions-index.json
    if (sessionId === 'sessions-index') {
      return null;
    }

    return { projectId, sessionId };
  }

  private isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const timeSinceLastActivity = Date.now() - session.lastActivity;
    return timeSinceLastActivity < this.config.sessionIdleTimeoutMs;
  }

  private cleanupIdleSessions(): void {
    const now = Date.now();
    const idleTimeoutMs = this.config.sessionIdleTimeoutMs;

    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActivity > idleTimeoutMs) {
        this.sessions.delete(key);
        if (this.config.logLevel === 'debug') {
          console.debug('[SessionTracker] Removed idle session:', key);
        }
      }
    }
  }

  private checkState(): void {
    this.cleanupIdleSessions();

    const hasActiveSessions = this.sessions.size > 0;

    // State transitions
    if (hasActiveSessions && this.state === 'STARTING') {
      this.transitionTo('ACTIVE');
    } else if (hasActiveSessions && this.state === 'GRACE_PERIOD') {
      this.cancelGracePeriod();
      this.transitionTo('ACTIVE');
    } else if (!hasActiveSessions && this.state === 'ACTIVE') {
      this.transitionTo('IDLE');
      this.startGracePeriod();
    }
  }

  // Cleanup on exit
  destroy(): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    if (this.checkStateInterval) {
      clearInterval(this.checkStateInterval);
      this.checkStateInterval = null;
    }
  }
}

export const sessionTracker = new SessionTracker();
