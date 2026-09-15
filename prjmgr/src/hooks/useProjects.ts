/**
 * React hook for live project list from IndexedDB
 */

import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database';
import type { Project } from '../types';

export function useProjects(includeArchived = false) {
  const projects = useLiveQuery(
    async () => {
      if (includeArchived) {
        return db.projects.orderBy('updatedAt').reverse().toArray();
      }
      return db.projects
        .filter((p) => !p.isArchived)
        .reverse()
        .sortBy('updatedAt');
    },
    [includeArchived],
    [] as Project[]
  );

  const isLoading = projects === undefined;

  return {
    projects: projects ?? [],
    isLoading
  };
}

export function useProject(id: string | undefined) {
  const project = useLiveQuery(
    () => (id ? db.projects.get(id) : undefined),
    [id]
  );

  return {
    project,
    isLoading: project === undefined && !!id
  };
}

export function useProjectCount() {
  const count = useLiveQuery(async () => {
    const all = await db.projects.toArray();
    return {
      total: all.length,
      active: all.filter(
        (p) =>
          !p.isArchived &&
          p.status !== 'Completed' &&
          p.status !== 'Cancelled'
      ).length,
      completed: all.filter((p) => p.status === 'Completed').length,
      archived: all.filter((p) => p.isArchived).length
    };
  }, [], { total: 0, active: 0, completed: 0, archived: 0 });

  return count;
}
