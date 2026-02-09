'use client';

import { useDashboardData } from "@/lib/client/data-context";
import ProjectsTable from "../components/ProjectsTable";

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function ProjectsPage() {
  const { data } = useDashboardData();

  if (!data) return null; // Should be handled by LoadingScreen

  const { projects } = data;

  // Calculate totals
  const totalProjects = projects.length;
  const totalSessions = projects.reduce((sum, p) => sum + p.sessionCount, 0);
  const totalMessages = projects.reduce((sum, p) => sum + p.messageCount, 0);
  const totalCost = projects.reduce((sum, p) => sum + p.estimatedCost, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
        <p className="text-slate-400">
          {totalProjects} {totalProjects === 1 ? 'project' : 'projects'} tracked
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-white font-mono">{totalProjects.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Total Sessions</p>
          <p className="text-3xl font-bold text-blue-400 font-mono">{totalSessions.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Total Messages</p>
          <p className="text-3xl font-bold text-purple-400 font-mono">{totalMessages.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono">{formatCost(totalCost)}</p>
        </div>
      </div>

      {/* Projects Table */}
      <ProjectsTable projects={projects} />
    </div>
  );
}
