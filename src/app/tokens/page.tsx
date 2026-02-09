'use client';

import { useDashboardData } from '@/lib/client/data-context';
import TokensContent from '../components/TokensContent';

export default function TokensPage() {
  const { data } = useDashboardData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <TokensContent data={data} />;
}
