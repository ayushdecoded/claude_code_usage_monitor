import { getPerformanceMetrics } from '@/lib/server/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = getPerformanceMetrics();
    return Response.json(metrics);
  } catch (error) {
    console.error('[API] Failed to fetch metrics:', error);
    return Response.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
