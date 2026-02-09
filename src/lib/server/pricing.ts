import type { TokenUsage, ModelPricing } from '@/lib/types';

const PRICING: Record<string, ModelPricing> = {
  opus: { inputRate: 5, outputRate: 25, cacheReadRate: 0.50, cacheCreateRate: 6.25 },
  sonnet: { inputRate: 3, outputRate: 15, cacheReadRate: 0.30, cacheCreateRate: 3.75 },
  haiku: { inputRate: 1, outputRate: 5, cacheReadRate: 0.10, cacheCreateRate: 1.25 },
};

function matchPricing(model: string): ModelPricing {
  const m = model.toLowerCase();
  if (m.includes('opus')) return PRICING.opus;
  if (m.includes('haiku')) return PRICING.haiku;
  return PRICING.sonnet; // default
}

export function calculateCost(tokens: TokenUsage, model: string): number {
  const p = matchPricing(model);
  let cost = 0;
  cost += (tokens.input / 1_000_000) * p.inputRate;
  cost += (tokens.output / 1_000_000) * p.outputRate;
  if (tokens.cacheRead && p.cacheReadRate) cost += (tokens.cacheRead / 1_000_000) * p.cacheReadRate;
  if (tokens.cacheCreation && p.cacheCreateRate) cost += (tokens.cacheCreation / 1_000_000) * p.cacheCreateRate;
  return cost;
}
