/**
 * Project Service - CRUD operations for Projects
 * All operations are local-only via IndexedDB
 */

import { v4 as uuidv4 } from 'uuid';
import db from './database';
import type { Project, ProjectStatus } from '../types';

export async function getAllProjects(includeArchived = false): Promise<Project[]> {
  if (includeArchived) {
    return db.projects.orderBy('updatedAt').reverse().toArray();
  }
  return db.projects
    .filter((p) => !p.isArchived)
    .reverse()
    .sortBy('updatedAt');
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function createProject(data: {
  name: string;
  code?: string;
  description?: string;
  managerName?: string;
  client?: string;
  department?: string;
  projectType?: string;
  priority?: Project['priority'];
  startDate?: string;
  budget?: number;
  currency?: string;
  tags?: string[];
}): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: uuidv4(),
    name: data.name.trim(),
    code: data.code?.trim(),
    description: data.description?.trim(),
    managerName: data.managerName?.trim(),
    client: data.client?.trim(),
    department: data.department?.trim(),
    projectType: data.projectType,
    priority: data.priority || 'Medium',
    status: 'Planning',
    startDate: data.startDate || now.split('T')[0],
    plannedFinish: undefined,
    actualFinish: undefined,
    budget: data.budget,
    currency: data.currency || 'IRR',
    calendarId: undefined,
    statusDate: now.split('T')[0],
    notes: undefined,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
    isArchived: false
  };

  await db.projects.add(project);

  // Create root WBS node automatically
  await db.wbsNodes.add({
    id: uuidv4(),
    projectId: project.id,
    parentId: null,
    wbsCode: '1',
    name: project.name,
    description: 'گره ریشه پروژه',
    order: 0,
    isExpanded: true,
    weight: 100
  });

  // Log change
  await db.changeLog.add({
    id: uuidv4(),
    timestamp: now,
    type: 'project_created',
    details: { projectId: project.id, name: project.name }
  });

  return project;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<Project | undefined> {
  const existing = await db.projects.get(id);
  if (!existing) return undefined;

  const updated: Project = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await db.projects.put(updated);

  await db.changeLog.add({
    id: uuidv4(),
    timestamp: updated.updatedAt,
    type: 'project_updated',
    details: { projectId: id, changes: Object.keys(updates) }
  });

  return updated;
}

export async function archiveProject(id: string): Promise<boolean> {
  const result = await updateProject(id, {
    isArchived: true,
    status: 'Archived' as ProjectStatus
  });
  return !!result;
}

export async function unarchiveProject(id: string): Promise<boolean> {
  const result = await updateProject(id, {
    isArchived: false,
    status: 'On Hold' as ProjectStatus
  });
  return !!result;
}

export async function deleteProject(id: string): Promise<boolean> {
  const project = await db.projects.get(id);
  if (!project) return false;

  // Cascade delete related data
  await db.transaction(
    'rw',
    [
      db.projects,
      db.wbsNodes,
      db.tasks,
      db.dependencies,
      db.resources,
      db.resourceAssignments,
      db.calendars,
      db.holidays,
      db.baselines,
      db.progressRecords,
      db.costs,
      db.risks,
      db.issues,
      db.changeRequests,
      db.attachments,
      db.changeLog
    ],
    async () => {
      await db.wbsNodes.where('projectId').equals(id).delete();
      await db.tasks.where('projectId').equals(id).delete();
      await db.dependencies.where('projectId').equals(id).delete();
      await db.resources.where('projectId').equals(id).delete();
      await db.resourceAssignments.where('projectId').equals(id).delete();
      await db.calendars.where('projectId').equals(id).delete();
      // holidays linked via calendar
      await db.baselines.where('projectId').equals(id).delete();
      await db.progressRecords.where('projectId').equals(id).delete();
      await db.costs.where('projectId').equals(id).delete();
      await db.risks.where('projectId').equals(id).delete();
      await db.issues.where('projectId').equals(id).delete();
      await db.changeRequests.where('projectId').equals(id).delete();
      await db.attachments.where('projectId').equals(id).delete();
      await db.projects.delete(id);

      await db.changeLog.add({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'project_deleted',
        details: { projectId: id, name: project.name }
      });
    }
  );

  return true;
}

export async function duplicateProject(
  id: string,
  options: {
    copyWBS?: boolean;
    copyTasks?: boolean;
    copyResources?: boolean;
    newName?: string;
  } = {}
): Promise<Project | undefined> {
  const original = await db.projects.get(id);
  if (!original) return undefined;

  const now = new Date().toISOString();
  const newProject: Project = {
    ...original,
    id: uuidv4(),
    name: options.newName || `${original.name} (کپی)`,
    status: 'Planning',
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    actualFinish: undefined
  };

  await db.projects.add(newProject);

  // TODO: full copy of WBS/Tasks/Resources in later phases
  // For now create root WBS
  await db.wbsNodes.add({
    id: uuidv4(),
    projectId: newProject.id,
    parentId: null,
    wbsCode: '1',
    name: newProject.name,
    order: 0,
    isExpanded: true,
    weight: 100
  });

  await db.changeLog.add({
    id: uuidv4(),
    timestamp: now,
    type: 'project_duplicated',
    details: { fromId: id, toId: newProject.id }
  });

  return newProject;
}

export async function getProjectCount(): Promise<{
  total: number;
  active: number;
  completed: number;
  archived: number;
}> {
  const all = await db.projects.toArray();
  return {
    total: all.length,
    active: all.filter((p) => !p.isArchived && p.status !== 'Completed' && p.status !== 'Cancelled').length,
    completed: all.filter((p) => p.status === 'Completed').length,
    archived: all.filter((p) => p.isArchived).length
  };
}
