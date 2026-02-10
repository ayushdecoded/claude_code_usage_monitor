'use client';

import { useFilters } from '@/lib/client/filter-context';

export function ActiveFilterChips() {
  const {
    filters,
    activeFilterCount,
    setTokenTypes,
    toggleModel,
    toggleProject,
    setCostRange,
    setTokenRange,
  } = useFilters();

  if (activeFilterCount === 0) {
    return null;
  }

  const chipClasses =
    'px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-full flex items-center gap-2 transition-all duration-200';
  const xButtonClasses = 'hover:text-red-400 ml-2 cursor-pointer transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-700 focus:outline-none rounded px-1';

  return (
    <div className="flex flex-wrap gap-2" role="status" aria-live="polite" aria-label={`${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`}>
      {/* Token Type Filter Chip */}
      {filters.tokenTypes.length > 0 && (
        <div className={chipClasses}>
          <span>
            Token:{' '}
            {filters.tokenTypes.includes('input') &&
            filters.tokenTypes.includes('output')
              ? 'Input + Output'
              : filters.tokenTypes.includes('cacheRead') &&
                  filters.tokenTypes.includes('cacheCreation')
                ? 'Cache Only'
                : 'Custom'}
          </span>
          <button
            onClick={() => setTokenTypes([])}
            className={xButtonClasses}
            aria-label="Remove token type filter"
          >
            ×
          </button>
        </div>
      )}

      {/* Model Filter Chips */}
      {Array.from(filters.models).map((model) => (
        <div key={model} className={chipClasses}>
          <span>Model: {model}</span>
          <button
            onClick={() => toggleModel(model)}
            className={xButtonClasses}
            aria-label={`Remove ${model} filter`}
          >
            ×
          </button>
        </div>
      ))}

      {/* Project Filter Chips */}
      {Array.from(filters.projects).map((project) => (
        <div key={project} className={chipClasses}>
          <span>Project: {project}</span>
          <button
            onClick={() => toggleProject(project)}
            className={xButtonClasses}
            aria-label={`Remove ${project} filter`}
          >
            ×
          </button>
        </div>
      ))}

      {/* Cost Range Filter Chip */}
      {(filters.costRange.min !== null || filters.costRange.max !== null) && (
        <div className={chipClasses}>
          <span>
            Cost: $
            {filters.costRange.min ?? '0'} - $
            {filters.costRange.max ?? '∞'}
          </span>
          <button
            onClick={() => setCostRange({ min: null, max: null })}
            className={xButtonClasses}
            aria-label="Remove cost range filter"
          >
            ×
          </button>
        </div>
      )}

      {/* Token Range Filter Chip */}
      {(filters.tokenRange.min !== null || filters.tokenRange.max !== null) && (
        <div className={chipClasses}>
          <span>
            Tokens:{' '}
            {filters.tokenRange.min ?? '0'} - {filters.tokenRange.max ?? '∞'}
          </span>
          <button
            onClick={() => setTokenRange({ min: null, max: null })}
            className={xButtonClasses}
            aria-label="Remove token range filter"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
