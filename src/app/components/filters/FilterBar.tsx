'use client';

import { useState } from 'react';
import { useFilters } from '@/lib/client/filter-context';
import { useDashboardData } from '@/lib/client/data-context';
import { TokenTypeFilter } from './TokenTypeFilter';
import ModelFilter from './ModelFilter';
import ProjectFilter from './ProjectFilter';

/**
 * Minimal, refined filter bar with clean aesthetics
 */
export function FilterBar() {
  const { activeFilterCount, resetFilters } = useFilters();
  const { data, isLoading } = useDashboardData();
  const [isExpanded, setIsExpanded] = useState(false);

  // Show minimal loading state
  if (isLoading) {
    return (
      <div className="sticky top-[64px] z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50 px-6 py-3" role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <div className="w-3 h-3 border border-slate-600 border-t-slate-400 rounded-full animate-spin" aria-hidden="true" />
          <span>Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-[64px] z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50 transition-all duration-300">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-6 py-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors group focus:outline-none focus:text-slate-200"
          aria-expanded={isExpanded}
          aria-controls="filter-content"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-medium tracking-wide">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 text-xs font-mono text-slate-500">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:text-slate-300"
            aria-label={`Clear all ${activeFilterCount} filters`}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div
          id="filter-content"
          className="border-t border-slate-800/50 px-6 py-6 animate-[slideDown_0.3s_ease-out]"
        >
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Token Types */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-3 tracking-wider uppercase">
                Token Types
              </label>
              <TokenTypeFilter />
            </div>

            {/* Models */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-3 tracking-wider uppercase">
                Models
              </label>
              <ModelFilter />
            </div>

            {/* Projects */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-3 tracking-wider uppercase">
                Projects
              </label>
              <ProjectFilter />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
