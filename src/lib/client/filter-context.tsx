'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FilterState, TokenTypeFilter } from '@/lib/types';

interface FilterContextValue {
  filters: FilterState;
  setTokenTypes: (types: TokenTypeFilter[]) => void;
  toggleModel: (model: string) => void;
  toggleProject: (project: string) => void;
  setCostRange: (range: { min: number | null; max: number | null }) => void;
  setTokenRange: (range: { min: number | null; max: number | null }) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// Default empty filter state
const defaultFilters: FilterState = {
  tokenTypes: [],
  models: new Set<string>(),
  projects: new Set<string>(),
  costRange: { min: null, max: null },
  tokenRange: { min: null, max: null },
};

// Parse URL params into FilterState
function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  const tokenTypesParam = searchParams.get('tt');
  const modelsParam = searchParams.get('m');
  const projectsParam = searchParams.get('p');
  const costMinParam = searchParams.get('costMin');
  const costMaxParam = searchParams.get('costMax');
  const tokenMinParam = searchParams.get('tokenMin');
  const tokenMaxParam = searchParams.get('tokenMax');

  return {
    tokenTypes: tokenTypesParam
      ? (tokenTypesParam.split(',').filter(Boolean) as TokenTypeFilter[])
      : [],
    models: new Set(modelsParam ? modelsParam.split(',').filter(Boolean) : []),
    projects: new Set(projectsParam ? projectsParam.split(',').filter(Boolean) : []),
    costRange: {
      min: costMinParam ? parseFloat(costMinParam) : null,
      max: costMaxParam ? parseFloat(costMaxParam) : null,
    },
    tokenRange: {
      min: tokenMinParam ? parseInt(tokenMinParam, 10) : null,
      max: tokenMaxParam ? parseInt(tokenMaxParam, 10) : null,
    },
  };
}

// Serialize FilterState to URL params
function serializeFiltersToURL(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.tokenTypes.length > 0) {
    params.set('tt', filters.tokenTypes.join(','));
  }

  if (filters.models.size > 0) {
    params.set('m', Array.from(filters.models).join(','));
  }

  if (filters.projects.size > 0) {
    params.set('p', Array.from(filters.projects).join(','));
  }

  if (filters.costRange.min !== null) {
    params.set('costMin', filters.costRange.min.toString());
  }

  if (filters.costRange.max !== null) {
    params.set('costMax', filters.costRange.max.toString());
  }

  if (filters.tokenRange.min !== null) {
    params.set('tokenMin', filters.tokenRange.min.toString());
  }

  if (filters.tokenRange.max !== null) {
    params.set('tokenMax', filters.tokenRange.max.toString());
  }

  return params;
}

// Count active filters (non-default values)
function countActiveFilters(filters: FilterState): number {
  let count = 0;

  if (filters.tokenTypes.length > 0) count++;
  if (filters.models.size > 0) count++;
  if (filters.projects.size > 0) count++;
  if (filters.costRange.min !== null || filters.costRange.max !== null) count++;
  if (filters.tokenRange.min !== null || filters.tokenRange.max !== null) count++;

  return count;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() =>
    parseFiltersFromURL(searchParams)
  );

  // Track debounce timers
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync filters to URL (with debouncing for range updates)
  const syncToURL = useCallback(
    (newFilters: FilterState, immediate = false) => {
      const updateURL = () => {
        const params = serializeFiltersToURL(newFilters);
        const queryString = params.toString();
        const newURL = queryString ? `?${queryString}` : window.location.pathname;
        router.replace(newURL, { scroll: false });
      };

      if (immediate) {
        // Clear any pending debounce
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        updateURL();
      } else {
        // Debounce URL updates (for range inputs)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(updateURL, 300);
      }
    },
    [router]
  );

  // Initialize from URL on mount
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams);
    setFilters(urlFilters);
  }, [searchParams]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const setTokenTypes = useCallback(
    (types: TokenTypeFilter[]) => {
      const newFilters = { ...filters, tokenTypes: types };
      setFilters(newFilters);
      syncToURL(newFilters, true);
    },
    [filters, syncToURL]
  );

  const toggleModel = useCallback(
    (model: string) => {
      const newModels = new Set(filters.models);
      if (newModels.has(model)) {
        newModels.delete(model);
      } else {
        newModels.add(model);
      }
      const newFilters = { ...filters, models: newModels };
      setFilters(newFilters);
      syncToURL(newFilters, true);
    },
    [filters, syncToURL]
  );

  const toggleProject = useCallback(
    (project: string) => {
      const newProjects = new Set(filters.projects);
      if (newProjects.has(project)) {
        newProjects.delete(project);
      } else {
        newProjects.add(project);
      }
      const newFilters = { ...filters, projects: newProjects };
      setFilters(newFilters);
      syncToURL(newFilters, true);
    },
    [filters, syncToURL]
  );

  const setCostRange = useCallback(
    (range: { min: number | null; max: number | null }) => {
      const newFilters = { ...filters, costRange: range };
      setFilters(newFilters);
      syncToURL(newFilters, false); // Debounced
    },
    [filters, syncToURL]
  );

  const setTokenRange = useCallback(
    (range: { min: number | null; max: number | null }) => {
      const newFilters = { ...filters, tokenRange: range };
      setFilters(newFilters);
      syncToURL(newFilters, false); // Debounced
    },
    [filters, syncToURL]
  );

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    syncToURL(defaultFilters, true);
  }, [syncToURL]);

  const activeFilterCount = countActiveFilters(filters);

  const value: FilterContextValue = {
    filters,
    setTokenTypes,
    toggleModel,
    toggleProject,
    setCostRange,
    setTokenRange,
    resetFilters,
    activeFilterCount,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
