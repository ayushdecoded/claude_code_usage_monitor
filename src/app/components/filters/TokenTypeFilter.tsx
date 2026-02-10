'use client';

import { useFilters } from '@/lib/client/filter-context';

export function TokenTypeFilter() {
  const { filters, setTokenTypes } = useFilters();

  const isInputOutput =
    filters.tokenTypes.length === 2 &&
    filters.tokenTypes.includes('input') &&
    filters.tokenTypes.includes('output');

  const isCacheOnly =
    filters.tokenTypes.length === 2 &&
    filters.tokenTypes.includes('cacheRead') &&
    filters.tokenTypes.includes('cacheCreation');

  const isTotal = filters.tokenTypes.length === 0;

  const options = [
    { label: 'Input + Output', active: isInputOutput, onClick: () => setTokenTypes(['input', 'output']) },
    { label: 'Cache', active: isCacheOnly, onClick: () => setTokenTypes(['cacheRead', 'cacheCreation']) },
    { label: 'All', active: isTotal, onClick: () => setTokenTypes([]) },
  ];

  return (
    <div className="inline-flex border border-slate-800 rounded-md overflow-hidden">
      {options.map((option, index) => (
        <button
          key={option.label}
          onClick={option.onClick}
          className={`
            px-4 py-2 text-xs font-medium transition-all
            ${option.active
              ? 'bg-slate-800 text-slate-200'
              : 'bg-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
            }
            ${index > 0 ? 'border-l border-slate-800' : ''}
            focus:outline-none focus:z-10 focus:ring-1 focus:ring-inset focus:ring-slate-600
          `}
          aria-pressed={option.active}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
