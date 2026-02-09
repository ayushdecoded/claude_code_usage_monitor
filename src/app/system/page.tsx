'use client';

import { useDashboardData } from '@/lib/client/data-context';
import MetricsClient from '../components/MetricsClient';
import { useEffect, useState } from 'react';
import type { AggregateMetrics } from '@/lib/server/performance/metrics-tracker';

export default function SystemPage() {
  const { data } = useDashboardData();
  const [metrics, setMetrics] = useState<(AggregateMetrics & { memory: { heapUsed: number; heapTotal: number; rss: number } | null }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const metricsData = await response.json();
        setMetrics(metricsData);
      } catch (error) {
        console.error('[SystemPage] Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (!data || !metrics || loading) return null; // Should be handled by LoadingScreen

  return (
    <MetricsClient
      initialMetrics={metrics}
      title="System Metrics"
      subtitle="Real-time monitoring of parser performance, caching, and system resources"
    />
  );
}
