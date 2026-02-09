import { getDashboardData } from '@/lib/server/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDashboardData();
    return Response.json(data);
  } catch (error) {
    console.error('[API] Failed to fetch dashboard data:', error);
    return Response.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
