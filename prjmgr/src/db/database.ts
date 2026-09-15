/**
 * Dexie.js Database Layer - Local-First Offline Storage
 * Schema Version: 1
 */

import Dexie, { type Table } from 'dexie';
import type {
  Project,
  WBSNode,
  Task,
  Dependency,
  AppSettings,
  Holiday,
  HijriMonth
} from '../types';
import { SCHEMA_VERSION, STORES } from './schema';

// Extended interfaces for DB (some fields may be added later)
export interface Resource {
  id: string;
  projectId: string;
  name: string;
  code?: string;
  type: 'Human' | 'Equipment' | 'Material' | 'Cost';
  department?: string;
  skill?: string;
  capacity: number;
  unit?: string;
  standardRate?: number;
  overtimeRate?: number;
  availability?: number;
  calendarId?: string;
  cost?: number;
  notes?: string;
}

export interface ResourceAssignment {
  id: string;
  projectId: string;
  taskId: string;
  resourceId: string;
  units: number; // percentage or quantity
}

export interface Calendar {
  id: string;
  projectId?: string; // null = global
  name: string;
  workingDays: number[]; // 0=Sat ... 6=Fri
  workingHoursStart: string;
  workingHoursEnd: string;
  halfDay?: string;
  isDefault?: boolean;
}

export interface Baseline {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  data: any; // snapshot of tasks at that time
}

export interface ProgressRecord {
  id: string;
  projectId: string;
  taskId: string;
  date: string;
  physical: number;
  weighted: number;
  work?: number;
  cost?: number;
}

export interface Cost {
  id: string;
  projectId: string;
  taskId?: string;
  type: 'Resource' | 'Material' | 'Fixed' | 'Other';
  amount: number;
  currency?: string;
  date?: string;
  notes?: string;
}

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  probability: number; // 1-5
  impact: number; // 1-5
  score: number;
  owner?: string;
  response?: string;
  mitigation?: string;
  contingency?: string;
  status: string;
  dueDate?: string;
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  priority: string;
  owner?: string;
  status: string;
  createdDate: string;
  dueDate?: string;
  resolution?: string;
  impact?: string;
}

export interface ChangeRequest {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  requester?: string;
  date: string;
  scopeImpact?: string;
  timeImpact?: string;
  costImpact?: number;
  approvalStatus: string;
  decision?: string;
}

export interface Attachment {
  id: string;
  projectId?: string;
  entityType: string;
  entityId: string;
  name: string;
  size: number;
  mimeType?: string;
  blob?: Blob;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  description?: string;
  data: any;
  createdAt: string;
}

export interface CustomField {
  id: string;
  entityType: string;
  name: string;
  type: 'Text' | 'Number' | 'Date' | 'Boolean' | 'Currency' | 'Percentage' | 'Dropdown';
  options?: string[];
  defaultValue?: any;
}

export interface BackupMeta {
  id: string;
  type: 'full' | 'project' | 'selected' | 'auto' | 'safety';
  createdAt: string;
  size: number;
  projectIds: string[];
  schemaVersion: number;
  checksum?: string;
  name?: string;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  type: string;
  details: any;
}

export interface LocalBackup {
  id: string;
  createdAt: string;
  type: string;
  data: any; // compressed or raw backup payload
}

export interface HijriYear {
  id: string; // year as string
  year: number;
}

class ProjectManagerDB extends Dexie {
  projects!: Table<Project, string>;
  wbsNodes!: Table<WBSNode, string>;
  tasks!: Table<Task, string>;
  dependencies!: Table<Dependency, string>;
  resources!: Table<Resource, string>;
  resourceAssignments!: Table<ResourceAssignment, string>;
  calendars!: Table<Calendar, string>;
  holidays!: Table<Holiday, string>;
  hijriYears!: Table<HijriYear, string>;
  hijriMonths!: Table<HijriMonth, string>;
  baselines!: Table<Baseline, string>;
  progressRecords!: Table<ProgressRecord, string>;
  costs!: Table<Cost, string>;
  risks!: Table<Risk, string>;
  issues!: Table<Issue, string>;
  changeRequests!: Table<ChangeRequest, string>;
  attachments!: Table<Attachment, string>;
  templates!: Table<Template, string>;
  customFields!: Table<CustomField, string>;
  settings!: Table<AppSettings, string>;
  backups!: Table<BackupMeta, string>;
  changeLog!: Table<ChangeLogEntry, string>;
  localBackups!: Table<LocalBackup, string>;

  constructor() {
    super('ProjectManagerLightDB');

    this.version(SCHEMA_VERSION).stores(STORES);

    // Future migrations example:
    // this.version(2).stores({ ... }).upgrade(tx => { ... });
  }
}

export const db = new ProjectManagerDB();

// Helper: ensure default settings exist
export async function ensureDefaultSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('settings');
  if (existing) return existing;

  const defaults: AppSettings = {
    id: 'settings',
    language: 'fa',
    theme: 'system',
    timezone: 'Asia/Tehran',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: 'fa-IR',
    workingDays: [0, 1, 2, 3, 4], // شنبه تا چهارشنبه
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    halfDayHours: '08:00-12:00',
    autoBackupEnabled: true,
    autoBackupInterval: 'onChange',
    schemaVersion: SCHEMA_VERSION
  };

  await db.settings.put(defaults);
  return defaults;
}

// Helper: clear all data (with safety)
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}

// Helper: get storage estimate
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percent: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    return {
      usage,
      quota,
      percent: quota > 0 ? Math.round((usage / quota) * 100) : 0
    };
  }
  return { usage: 0, quota: 0, percent: 0 };
}

export default db;
