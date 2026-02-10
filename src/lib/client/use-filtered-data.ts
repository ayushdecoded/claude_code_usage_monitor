'use client';

import { useMemo } from 'react';
import { useDashboardData } from './data-context';
import { useFilters } from './filter-context';
import {
  filterTokenUsage,
  recalculateCost,
  getTotalTokens,
  calculateCacheHitRate,
} from './filter-utils';
import type { DashboardData, ProjectSummary, TokenUsage } from '@/lib/types';

/**
 * Main filtering engine that applies all active filters to dashboard data.
 * Returns transformed DashboardData with filtered models, projects, and recalculated metrics.
 */
export function useFilteredData(): DashboardData | null {
  const { data, isLoading } = useDashboardData();
  const { filters } = useFilters();

  return useMemo(() => {
    // Return null if data is not available
    if (isLoading || !data) {
      return null;
    }

    // Serialize filter values for stable memoization
    const tokenTypesKey = JSON.stringify(filters.tokenTypes);
    const modelsKey = JSON.stringify(Array.from(filters.models).sort());
    const projectsKey = JSON.stringify(Array.from(filters.projects).sort());
    const costRangeKey = JSON.stringify(filters.costRange);
    const tokenRangeKey = JSON.stringify(filters.tokenRange);

    // 1. Filter model breakdown
    let filteredModelBreakdown = { ...data.modelBreakdown };

    // Apply model filter (if any models selected, only include those)
    if (filters.models.size > 0) {
      filteredModelBreakdown = Object.fromEntries(
        Object.entries(filteredModelBreakdown).filter(([modelName]) =>
          filters.models.has(modelName)
        )
      );
    }

    // 2. Apply token type filter to each model
    filteredModelBreakdown = Object.fromEntries(
      Object.entries(filteredModelBreakdown).map(([modelName, modelData]) => {
        const filteredTokens = filterTokenUsage(modelData.tokenUsage, filters.tokenTypes);
        const recalculatedCost = recalculateCost(filteredTokens, modelName);

        return [
          modelName,
          {
            tokenUsage: filteredTokens,
            estimatedCost: recalculatedCost,
          },
        ];
      })
    );

    // 3. Aggregate totals from filtered models
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheCreationTokens = 0;
    let totalEstimatedCost = 0;

    Object.values(filteredModelBreakdown).forEach((modelData) => {
      totalInputTokens += modelData.tokenUsage.input;
      totalOutputTokens += modelData.tokenUsage.output;
      totalCacheReadTokens += modelData.tokenUsage.cacheRead || 0;
      totalCacheCreationTokens += modelData.tokenUsage.cacheCreation || 0;
      totalEstimatedCost += modelData.estimatedCost;
    });

    // 4. Filter projects by project name
    let filteredProjects = [...data.projects];

    if (filters.projects.size > 0) {
      filteredProjects = filteredProjects.filter((project) =>
        filters.projects.has(project.name)
      );
    }

    // 5. Apply token type filter to projects
    filteredProjects = filteredProjects.map((project) => {
      const filteredTokens = filterTokenUsage(project.totalTokens, filters.tokenTypes);
      const totalProjectTokens = getTotalTokens(filteredTokens);

      // For project cost recalculation, we don't have per-project model info,
      // so calculate proportional cost based on token ratio
      const originalTotalTokens = getTotalTokens(project.totalTokens);
      const tokenRatio = originalTotalTokens > 0 ? totalProjectTokens / originalTotalTokens : 0;
      const recalculatedCost = project.estimatedCost * tokenRatio;

      return {
        ...project,
        totalTokens: filteredTokens,
        estimatedCost: recalculatedCost,
      };
    });

    // 6. Apply cost and token range filters to projects
    if (filters.costRange.min !== null || filters.costRange.max !== null) {
      filteredProjects = filteredProjects.filter((project) => {
        const cost = project.estimatedCost;
        const meetsMin = filters.costRange.min === null || cost >= filters.costRange.min;
        const meetsMax = filters.costRange.max === null || cost <= filters.costRange.max;
        return meetsMin && meetsMax;
      });
    }

    if (filters.tokenRange.min !== null || filters.tokenRange.max !== null) {
      filteredProjects = filteredProjects.filter((project) => {
        const tokens = getTotalTokens(project.totalTokens);
        const meetsMin = filters.tokenRange.min === null || tokens >= filters.tokenRange.min;
        const meetsMax = filters.tokenRange.max === null || tokens <= filters.tokenRange.max;
        return meetsMin && meetsMax;
      });
    }

    // 7. Recalculate totalEstimatedCost from filtered projects (source of truth)
    // Per CLAUDE.md: "Per-project token aggregation is more accurate than stats-cache.json,
    // so project costs are summed to override global totals"
    const recalculatedTotalCost = filteredProjects.reduce((sum, p) => sum + p.estimatedCost, 0);

    // 8. Recalculate derived metrics using project-based total cost
    const cacheHitRate = calculateCacheHitRate(
      totalInputTokens,
      totalCacheReadTokens,
      totalCacheCreationTokens
    );

    const avgCostPerSession =
      data.stats.totalSessions > 0 ? recalculatedTotalCost / data.stats.totalSessions : 0;

    const avgCostPerMessage =
      data.stats.totalMessages > 0 ? recalculatedTotalCost / data.stats.totalMessages : 0;

    const totalFilteredTokens =
      totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheCreationTokens;

    const avgTokensPerMessage =
      data.stats.totalMessages > 0 ? totalFilteredTokens / data.stats.totalMessages : 0;

    // 9. Keep dailyCosts unchanged from server
    // Note: dailyCosts from server only include non-cache token costs.
    // When token filters are active, time-based cost filtering may be inaccurate.
    // We keep the original dailyCosts to maintain accurate daily breakdown when no filters active.
    const dailyCosts = data.dailyCosts;

    // 10. Recalculate top projects
    const topProjectsByCost = [...filteredProjects]
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .slice(0, 10);

    const topProjectsByMessages = [...filteredProjects]
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    // 11. Return transformed dashboard data
    return {
      ...data,
      modelBreakdown: filteredModelBreakdown,
      projects: filteredProjects,
      totalEstimatedCost: recalculatedTotalCost, // Use project-based total as source of truth
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalCacheCreationTokens,
      cacheHitRate,
      avgCostPerSession,
      avgCostPerMessage,
      avgTokensPerMessage,
      dailyCosts,
      topProjectsByCost,
      topProjectsByMessages,
    };
  }, [
    data,
    isLoading,
    // Use serialized keys for stable memoization (avoid Set/array reference changes)
    filters.tokenTypes.join(','),
    Array.from(filters.models).sort().join(','),
    Array.from(filters.projects).sort().join(','),
    JSON.stringify(filters.costRange),
    JSON.stringify(filters.tokenRange),
  ]);
}
