'use client';

import { useFilteredData } from '@/lib/client/use-filtered-data';
import TokensContent from '../components/TokensContent';

export default function TokensPage() {
  const data = useFilteredData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <TokensContent data={data} />;
}
