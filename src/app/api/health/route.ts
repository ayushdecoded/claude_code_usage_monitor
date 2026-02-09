import { sessionTracker } from '@/lib/server/session-tracker';
import { sseManager } from '@/lib/server/sse-manager';
import { getPerformanceMetrics } from '@/lib/server/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = sessionTracker.getState();
    const metrics = getPerformanceMetrics();

    return Response.json({
      status: state.state,
      uptime: process.uptime(),
      activeSessions: state.activeSessions.map(s => ({
        projectId: s.projectId,
        sessionId: s.sessionId,
        lastActivity: s.lastActivity,
      })),
      graceTimer: {
        active: state.graceTimer.active,
        remainingMs: state.graceTimer.remainingMs,
        remainingMinutes: Math.ceil(state.graceTimer.remainingMs / 60000),
      },
      connectedClients: sseManager.getClientCount(),
      serverPid: process.pid,
      performance: {
        parseTimeMs: metrics.lastParse?.parseTimeMs || 0,
        cacheHitRate: metrics.averageCacheHitRate || 0,
      },
    });
  } catch (error) {
    console.error('[API] Failed to fetch health:', error);
    return Response.json({ error: 'Failed to fetch health' }, { status: 500 });
  }
}
