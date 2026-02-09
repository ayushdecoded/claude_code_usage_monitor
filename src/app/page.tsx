'use client';

import { useDashboardData } from "@/lib/client/data-context";
import OverviewContent from "./components/OverviewContent";

export default function Home() {
  const { data } = useDashboardData();

  if (!data) return null; // Should be handled by LoadingScreen

  return <OverviewContent data={data} />;
}
