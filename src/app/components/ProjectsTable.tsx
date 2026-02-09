'use client';

import type { ProjectSummary } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useState, useMemo } from 'react';

type SortColumn = 'name' | 'sessions' | 'messages' | 'tokens' | 'cost' | 'lastActive';
type SortDirection = 'asc' | 'desc';

interface ProjectsTableProps {
  projects: ProjectSummary[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function getTotalTokens(project: ProjectSummary): number {
  const { input, output, cacheRead = 0, cacheCreation = 0 } = project.totalTokens;
  return input + output + cacheRead + cacheCreation;
}

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export default function ProjectsTable({ projects }: ProjectsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('cost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedAndFilteredProjects = useMemo(() => {
    let filtered = projects;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.path.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'sessions':
          aVal = a.sessionCount;
          bVal = b.sessionCount;
          break;
        case 'messages':
          aVal = a.messageCount;
          bVal = b.messageCount;
          break;
        case 'tokens':
          aVal = getTotalTokens(a);
          bVal = getTotalTokens(b);
          break;
        case 'cost':
          aVal = a.estimatedCost;
          bVal = b.estimatedCost;
          break;
        case 'lastActive':
          aVal = new Date(a.lastActive).getTime();
          bVal = new Date(b.lastActive).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [projects, sortColumn, sortDirection, searchQuery]);

  const maxCost = Math.max(...projects.map((p) => p.estimatedCost), 0.01);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <span className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
          ▼
        </span>
      );
    }
    return (
      <span className="text-blue-400">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (projects.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <p className="text-slate-400 text-lg">No projects found</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden transition-all duration-300">
      {/* Search bar */}
      <div className="p-4 border-b border-slate-700">
        <input
          type="text"
          placeholder="Search projects by name or path..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700">
              <th
                className="px-6 py-4 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-all duration-200 group"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Project
                  <SortIcon column="name" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-right text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-all duration-200 group"
                onClick={() => handleSort('sessions')}
              >
                <div className="flex items-center justify-end gap-2">
                  Sessions
                  <SortIcon column="sessions" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-right text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-all duration-200 group"
                onClick={() => handleSort('messages')}
              >
                <div className="flex items-center justify-end gap-2">
                  Messages
                  <SortIcon column="messages" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-right text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-all duration-200 group"
                onClick={() => handleSort('tokens')}
              >
                <div className="flex items-center justify-end gap-2">
                  Tokens
                  <SortIcon column="tokens" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-right text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-all duration-200 group"
                onClick={() => handleSort('cost')}
              >
                <div className="flex items-center justify-end gap-2">
                  Cost
                  <SortIcon column="cost" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-right text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-all duration-200 group"
                onClick={() => handleSort('lastActive')}
              >
                <div className="flex items-center justify-end gap-2">
                  Last Active
                  <SortIcon column="lastActive" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No projects match your search
                </td>
              </tr>
            ) : (
              sortedAndFilteredProjects.map((project, idx) => {
                const totalTokens = getTotalTokens(project);
                const costBarWidth = (project.estimatedCost / maxCost) * 100;

                return (
                  <tr
                    key={project.path}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-all duration-200 ${
                      idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-900/30'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-white mb-0.5">
                          {project.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-md">
                          {project.path}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 font-mono">
                      {project.sessionCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 font-mono">
                      {project.messageCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-blue-400 font-mono">
                      {formatTokens(totalTokens)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-emerald-400 font-mono font-medium">
                          {formatCost(project.estimatedCost)}
                        </span>
                        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.max(costBarWidth, 2)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 text-sm">
                      {formatRelativeTime(project.lastActive)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-700 text-sm text-slate-400">
          Showing {sortedAndFilteredProjects.length} of {projects.length} projects
        </div>
      )}
    </div>
  );
}
