/**
 * Piscina worker for parsing Claude projects in parallel.
 * This file must export a default function that Piscina can invoke.
 */

import { parseProjects } from './project-parser';

export interface WorkerTask {
  projectIds: string[];
  projectsDir: string;
}

/**
 * Worker entry point called by Piscina.
 * @param task - Contains project IDs and directory path
 * @returns Array of ProjectSummary objects (serializable)
 */
export default async function (task: WorkerTask) {
  try {
    return await parseProjects(task.projectIds, task.projectsDir);
  } catch (error) {
    console.error('[Worker] Parse error:', error);
    throw error; // Piscina will handle worker failure
  }
}
