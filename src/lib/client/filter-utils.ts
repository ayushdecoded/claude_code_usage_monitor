import type { TokenUsage, TokenTypeFilter } from '@/lib/types';
import { PRICING, matchPricing } from '@/lib/server/pricing';

/**
 * Filters token usage by specified token types.
 * If types array is empty, returns tokens unchanged (all types included).
 * Otherwise, returns TokenUsage with only specified types, others set to 0.
 */
export function filterTokenUsage(tokens: TokenUsage, types: TokenTypeFilter[]): TokenUsage {
  // Empty array means include all types
  if (types.length === 0) {
    return tokens;
  }

  const filtered: TokenUsage = {
    input: types.includes('input') ? tokens.input : 0,
    output: types.includes('output') ? tokens.output : 0,
    cacheRead: types.includes('cacheRead') ? (tokens.cacheRead || 0) : 0,
    cacheCreation: types.includes('cacheCreation') ? (tokens.cacheCreation || 0) : 0,
  };

  return filtered;
}

/**
 * Recalculates cost based on filtered token usage and model pricing.
 * Returns total cost in USD.
 */
export function recalculateCost(tokens: TokenUsage, modelName: string): number {
  const pricing = matchPricing(modelName);

  let cost = 0;

  // Input tokens
  cost += (tokens.input / 1_000_000) * pricing.inputRate;

  // Output tokens
  cost += (tokens.output / 1_000_000) * pricing.outputRate;

  // Cache read tokens (90% discount)
  if (tokens.cacheRead && pricing.cacheReadRate) {
    cost += (tokens.cacheRead / 1_000_000) * pricing.cacheReadRate;
  }

  // Cache creation tokens (25% surcharge)
  if (tokens.cacheCreation && pricing.cacheCreateRate) {
    cost += (tokens.cacheCreation / 1_000_000) * pricing.cacheCreateRate;
  }

  return cost;
}

/**
 * Calculates total tokens across all token types.
 */
export function getTotalTokens(tokens: TokenUsage): number {
  return (
    tokens.input +
    tokens.output +
    (tokens.cacheRead || 0) +
    (tokens.cacheCreation || 0)
  );
}

/**
 * Calculates cache hit rate as a percentage.
 * Returns percentage: (cacheReadTokens / (inputTokens + cacheReadTokens + cacheCreationTokens)) * 100
 * Returns 0 if denominator is 0.
 */
export function calculateCacheHitRate(
  inputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number
): number {
  const denominator = inputTokens + cacheReadTokens + cacheCreationTokens;

  if (denominator === 0) {
    return 0;
  }

  return (cacheReadTokens / denominator) * 100;
}
