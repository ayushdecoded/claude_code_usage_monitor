'use client';

import { useDashboardData } from '@/lib/client/data-context';
import LoadingScreen from './LoadingScreen';
import NavLinks from './NavLinks';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const { isLoading, error, refetch } = useDashboardData();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl">⚠️</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Failed to Load Data</h2>
            <p className="text-slate-400">{error.message}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">C</div>
            <h1 className="text-lg font-semibold text-white">Claude Usage Dashboard</h1>
          </div>
          <NavLinks />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </>
  );
}
