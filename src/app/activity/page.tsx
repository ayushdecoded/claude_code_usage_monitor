'use client';

import { useDashboardData } from '@/lib/client/data-context';
import ActivityContent from '../components/ActivityContent';

export default function ActivityPage() {
  const { data } = useDashboardData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <ActivityContent data={data} />;
}
