'use client';

import { useSSE } from '@/lib/client/use-sse';

export default function SSEProvider({ children }: { children: React.ReactNode }) {
  const { isConnected } = useSSE();

  return (
    <>
      {/* Connection status indicator */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 transition-all duration-300">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            isConnected ? 'bg-green-500' : 'bg-amber-500'
          }`}
        />
        <span className="text-xs font-mono text-slate-300">
          {isConnected ? 'Live' : 'Reconnecting...'}
        </span>
      </div>
      {children}
    </>
  );
}
