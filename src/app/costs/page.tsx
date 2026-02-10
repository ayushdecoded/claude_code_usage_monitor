'use client';

import { useFilteredData } from "@/lib/client/use-filtered-data";
import CostsContent from '../components/CostsContent';

export default function CostsPage() {
  const data = useFilteredData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <CostsContent data={data} />;
}
