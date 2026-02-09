'use client';

import { useDashboardData } from '@/lib/client/data-context';
import CostsContent from '../components/CostsContent';

export default function CostsPage() {
  const { data } = useDashboardData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <CostsContent data={data} />;
}
