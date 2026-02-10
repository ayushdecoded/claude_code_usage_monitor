'use client';

import { useFilteredData } from '@/lib/client/use-filtered-data';
import ActivityContent from '../components/ActivityContent';

export default function ActivityPage() {
  const data = useFilteredData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <ActivityContent data={data} />;
}
