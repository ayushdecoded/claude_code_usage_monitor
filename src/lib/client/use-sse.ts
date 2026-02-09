'use client';

import { useEffect, useRef, useState } from 'react';

interface SSEHookResult {
  isConnected: boolean;
  lastUpdate: number | null;
}

/**
 * Hook for real-time SSE updates
 * Connects to /api/events and triggers page refresh on data changes
 * Auto-reconnects with exponential backoff on failure
 */
export function useSSE(): SSEHookResult {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectDelayRef = useRef(1000); // Start at 1s
  const MAX_RECONNECT_DELAY = 30000; // Cap at 30s

  useEffect(() => {
    let isComponentMounted = true;

    const connect = () => {
      try {
        const eventSource = new EventSource('/api/events');

        eventSource.addEventListener('connected', (event) => {
          if (!isComponentMounted) return;
          console.log('[SSE] Connected to server');
          setIsConnected(true);
          reconnectDelayRef.current = 1000; // Reset backoff on successful connection
        });

        eventSource.addEventListener('data-refresh', (event) => {
          if (!isComponentMounted) return;
          try {
            const data = JSON.parse(event.data);
            console.log('[SSE] Data refresh event:', data);
            setLastUpdate(data.timestamp);

            // Note: DataProvider will handle the actual data refetch
            // This hook just tracks connection status and update timestamp
          } catch (error) {
            console.error('[SSE] Failed to parse event data:', error);
          }
        });

        eventSource.addEventListener('error', () => {
          if (!isComponentMounted) return;
          console.log('[SSE] Connection error, attempting to reconnect...');
          setIsConnected(false);
          eventSource.close();

          // Exponential backoff reconnect
          const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY);
          reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

          setTimeout(() => {
            if (isComponentMounted) {
              connect();
            }
          }, delay);
        });

        eventSourceRef.current = eventSource;
      } catch (error) {
        console.error('[SSE] Failed to create EventSource:', error);
        setIsConnected(false);

        // Retry with backoff
        const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY);
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

        setTimeout(() => {
          if (isComponentMounted) {
            connect();
          }
        }, delay);
      }
    };

    // Connect immediately
    connect();

    // Cleanup on unmount
    return () => {
      isComponentMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsConnected(false);
      }
    };
  }, []);

  return { isConnected, lastUpdate };
}
