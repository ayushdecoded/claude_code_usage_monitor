'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { DashboardData } from '@/lib/types';

interface DataContextType {
  data: DashboardData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard-data');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const dashboardData = await response.json();

      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for SSE data-refresh events
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('data-refresh', async (event) => {
        console.log('[DataProvider] SSE data-refresh event received, refetching data...');
        await fetchData();
      });

      eventSource.addEventListener('error', () => {
        console.log('[DataProvider] SSE connection error');
        eventSource?.close();
      });
    } catch (err) {
      console.error('[DataProvider] Failed to create SSE connection:', err);
    }

    return () => {
      eventSource?.close();
    };
  }, [fetchData]);

  return (
    <DataContext.Provider value={{ data, isLoading, error, refetch: fetchData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within DataProvider');
  }
  return context;
}
