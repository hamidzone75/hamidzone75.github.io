/** Core types for Project Management Light PWA - Schema v1 */

export type ProjectStatus =
  | 'Planning'
  | 'Not Started'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Cancelled'
  | 'Archived';

export type TaskType =
  | 'Task'
  | 'Summary'
  | 'Milestone'
  | 'Recurring'
  | 'Manual'
  | 'Auto';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type ResourceType = 'Human' | 'Equipment' | 'Material' | 'Cost';

export type ConstraintType =
  | 'ASAP'
  | 'ALAP'
  | 'SNET'
  | 'SNLT'
  | 'FNET'
  | 'FNLT'
  | 'MSO'
  | 'MFO';

export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  managerName?: string;
  client?: string;
  department?: string;
  projectType?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: ProjectStatus;
  startDate: string; // ISO or Jalali string handled by DateEngine
  plannedFinish?: string;
  actualFinish?: string;
  budget?: number;
  currency: string;
  calendarId?: string;
  statusDate?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface WBSNode {
  id: string;
  projectId: string;
  parentId: string | null;
  wbsCode: string;
  name: string;
  description?: string;
  order: number;
  isExpanded: boolean;
  weight?: number;
}

export interface Task {
  id: string;
  projectId: string;
  wbsId: string;
  name: string;
  description?: string;
  type: TaskType;
  start?: string;
  finish?: string;
  duration?: number; // in minutes or working days units
  work?: number;
  effort?: number;
  progress: number; // 0-100
  weight: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: ProjectStatus;
  isMilestone: boolean;
  deadline?: string;
  constraint?: ConstraintType;
  constraintDate?: string;
  actualStart?: string;
  actualFinish?: string;
  actualDuration?: number;
  actualWork?: number;
  remainingDuration?: number;
  remainingWork?: number;
  notes?: string;
  order: number;
  isCritical?: boolean;
  totalFloat?: number;
  freeFloat?: number;
}

export interface Dependency {
  id: string;
  projectId: string;
  fromTaskId: string;
  toTaskId: string;
  type: DependencyType;
  lag: number; // in days (positive lag, negative lead)
}

export interface AppSettings {
  id: 'settings';
  language: 'fa' | 'en' | 'ar';
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  workingDays: number[]; // 0=Sat ... 6=Fri
  workingHoursStart: string;
  workingHoursEnd: string;
  halfDayHours?: string;
  defaultCalendarId?: string;
  autoBackupEnabled: boolean;
  autoBackupInterval: 'exit' | 'daily' | 'onChange';
  schemaVersion: number;
}

export interface Holiday {
  id: string;
  calendarId?: string;
  title: string;
  jalaliDate: string;
  gregorianDate?: string;
  hijriDate?: string;
  type: 'official-jalali' | 'official-hijri' | 'organizational' | 'custom' | 'emergency';
  description?: string;
  recurring: boolean;
  active: boolean;
}

export interface HijriMonth {
  id: string;
  year: number;
  month: number; // 1-12
  days: 29 | 30;
  startJalali?: string;
  endJalali?: string;
}
