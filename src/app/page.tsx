'use client';

import { useFilteredData } from "@/lib/client/use-filtered-data";
import OverviewContent from "./components/OverviewContent";

export default function Home() {
  const data = useFilteredData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <OverviewContent data={data} />;
}
