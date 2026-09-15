/**
 * IndexedDB Schema Definition - Schema Version 1
 * All stores and indexes according to the architecture
 */

export const SCHEMA_VERSION = 1;

export const STORES = {
  projects: 'id, name, status, startDate, finishDate, *tags, isArchived, updatedAt',
  wbsNodes: 'id, projectId, parentId, wbsCode, order',
  tasks: 'id, projectId, wbsId, name, start, finish, status, *predecessors, isCritical',
  dependencies: 'id, projectId, fromTaskId, toTaskId, type',
  resources: 'id, projectId, name, type, capacity',
  resourceAssignments: 'id, taskId, resourceId, units, projectId',
  calendars: 'id, projectId, name',
  holidays: 'id, calendarId, jalaliDate, hijriDate, type, recurring, active',
  hijriYears: 'id, year',
  hijriMonths: 'id, year, month, days',
  baselines: 'id, projectId, name, createdAt',
  progressRecords: 'id, taskId, date, physical, weighted, projectId',
  costs: 'id, projectId, taskId, type, amount',
  risks: 'id, projectId, title, status, score',
  issues: 'id, projectId, title, status, priority',
  changeRequests: 'id, projectId, title, status',
  attachments: 'id, entityType, entityId, name, size, projectId',
  templates: 'id, name, type',
  customFields: 'id, entityType, name, type',
  settings: 'id',
  backups: 'id, type, createdAt, size, *projectIds',
  changeLog: 'id, timestamp, type',
  localBackups: 'id, createdAt, type'
} as const;

export type StoreName = keyof typeof STORES;
