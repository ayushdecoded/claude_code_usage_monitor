'use client';

import { useDashboardData } from '@/lib/client/data-context';
import { useFilters } from '@/lib/client/filter-context';

export default function ModelFilter() {
  const { data, isLoading } = useDashboardData();
  const { filters, toggleModel } = useFilters();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-600 text-xs">
        <div className="w-3 h-3 border border-slate-700 border-t-slate-500 rounded-full animate-spin" />
        <span>Loading</span>
      </div>
    );
  }

  if (!data?.modelBreakdown) {
    return null;
  }

  const availableModels = Object.keys(data.modelBreakdown);

  if (availableModels.length === 0) {
    return (
      <div className="text-slate-600 text-xs px-3 py-2 bg-slate-900/30 rounded border border-slate-800">
        No models available
      </div>
    );
  }

  // Clean model name display
  const formatModelName = (model: string) => {
    const lower = model.toLowerCase();
    if (lower.includes('opus')) return 'Opus';
    if (lower.includes('sonnet')) return 'Sonnet';
    if (lower.includes('haiku')) return 'Haiku';
    return model;
  };

  // Subtle accent colors
  const getModelAccent = (model: string) => {
    const lower = model.toLowerCase();
    if (lower.includes('opus')) return 'border-purple-900/50 text-purple-400 hover:border-purple-800 data-[active]:bg-purple-950/30 data-[active]:border-purple-700';
    if (lower.includes('sonnet')) return 'border-blue-900/50 text-blue-400 hover:border-blue-800 data-[active]:bg-blue-950/30 data-[active]:border-blue-700';
    if (lower.includes('haiku')) return 'border-emerald-900/50 text-emerald-400 hover:border-emerald-800 data-[active]:bg-emerald-950/30 data-[active]:border-emerald-700';
    return 'border-slate-800 text-slate-400 hover:border-slate-700 data-[active]:bg-slate-900/50 data-[active]:border-slate-600';
  };

  const isModelSelected = (model: string) => {
    return filters.models.size === 0 || filters.models.has(model);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {availableModels.map((model) => {
        const selected = isModelSelected(model);
        const accent = getModelAccent(model);

        return (
          <button
            key={model}
            onClick={() => toggleModel(model)}
            data-active={selected || undefined}
            className={`
              px-3 py-1.5 text-xs font-medium rounded border transition-all
              ${accent}
              focus:outline-none focus:ring-1 focus:ring-slate-600 focus:ring-offset-1 focus:ring-offset-slate-900
            `}
            aria-label={`Toggle ${model} model filter`}
            aria-pressed={selected}
          >
            {formatModelName(model)}
          </button>
        );
      })}
    </div>
  );
}
