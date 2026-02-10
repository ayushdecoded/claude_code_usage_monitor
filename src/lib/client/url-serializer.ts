import type { FilterState, TokenTypeFilter } from '@/lib/types';

/**
 * Converts a FilterState object to URLSearchParams for query string serialization.
 * Only includes non-empty/non-default values to keep URLs clean.
 */
export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Token types: comma-separated (skip if empty = default)
  if (filters.tokenTypes.length > 0) {
    params.set('tt', filters.tokenTypes.join(','));
  }

  // Models: comma-separated (skip if empty = all)
  if (filters.models.size > 0) {
    params.set('m', Array.from(filters.models).join(','));
  }

  // Projects: comma-separated (skip if empty = all)
  if (filters.projects.size > 0) {
    params.set('p', Array.from(filters.projects).join(','));
  }

  // Cost range (skip if null)
  if (filters.costRange.min !== null) {
    params.set('costMin', filters.costRange.min.toString());
  }
  if (filters.costRange.max !== null) {
    params.set('costMax', filters.costRange.max.toString());
  }

  // Token range (skip if null)
  if (filters.tokenRange.min !== null) {
    params.set('tokenMin', filters.tokenRange.min.toString());
  }
  if (filters.tokenRange.max !== null) {
    params.set('tokenMax', filters.tokenRange.max.toString());
  }

  return params;
}

/**
 * Converts URLSearchParams back to a FilterState object.
 * Validates token types and handles missing parameters gracefully.
 */
export function deserializeFilters(params: URLSearchParams): FilterState {
  // Parse token types with validation
  const tokenTypesStr = params.get('tt');
  const validTokenTypes = ['input', 'output', 'cacheRead', 'cacheCreation'];
  const tokenTypes: TokenTypeFilter[] = tokenTypesStr
    ? tokenTypesStr
        .split(',')
        .filter((t) => validTokenTypes.includes(t)) as TokenTypeFilter[]
    : [];

  // Parse models
  const modelsStr = params.get('m');
  const models = new Set<string>(modelsStr ? modelsStr.split(',') : []);

  // Parse projects
  const projectsStr = params.get('p');
  const projects = new Set<string>(projectsStr ? projectsStr.split(',') : []);

  // Parse ranges with validation
  const costMin = parseNumber(params.get('costMin'));
  const costMax = parseNumber(params.get('costMax'));
  const tokenMin = parseNumber(params.get('tokenMin'));
  const tokenMax = parseNumber(params.get('tokenMax'));

  return {
    tokenTypes,
    models,
    projects,
    costRange: { min: costMin, max: costMax },
    tokenRange: { min: tokenMin, max: tokenMax },
  };
}

/**
 * Safely parses a numeric value from a string, returning null if invalid.
 */
function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}
