export type TaskPriority  = 'Critical' | 'High' | 'Medium' | 'Low';
export type TaskStatus    = 'ToDo' | 'InProgress' | 'Blocked' | 'InReview' | 'Done';
export type ProjectStatus = 'Active' | 'OnHold' | 'Completed' | 'Cancelled';
export type DueState      = '' | 'soon' | 'over';
export type TagVariant    = 'default' | 'auth' | 'billing' | 'infra' | 'perf' | 'design' | 'data' | 'a11y';

export interface ProjectDto {
  id: string; name: string; description: string | null;
  ownerId: string; departmentId: string | null;
  startDate: string | null; endDate: string | null; targetEndDate: string | null;
  budget: number | null; status: ProjectStatus;
  healthScore: number; memberCount: number; taskCount: number; createdAt: string;
}

export interface TaskDto {
  id: string; projectId: string; parentTaskId: string | null;
  title: string; description: string | null;
  assigneeId: string | null; reporterId: string;
  dueDate: string | null; priority: TaskPriority; status: TaskStatus;
  position: number; estimatedHours: number | null; loggedHours: number;
  isRecurring: boolean; recurrenceRule: string | null;
  tags: string[]; attachmentUrls: string[];
  aiSuggestedPriority: TaskPriority | null; aiSuggestedDueDate: string | null;
  createdAt: string; updatedAt: string | null;
  // UI extras
  commentCount?: number; linkCount?: number;
  blockedBy?: string;
  subDone?: number; subTotal?: number;
  dueState?: DueState;
  aiFlag?: boolean; aiWhy?: string;
}

export interface ProjectHealthDto {
  projectId: string; healthScore: number; totalTasks: number;
  completedTasks: number; overdueTasks: number; blockedTasks: number; aiSummary: string;
}


export interface ProjectMemberDto {
  employeeId: string;
  role: string;
  fullName: string;
  email: string;
  designation?: string;
}

export interface BacklogDto {
  tasks:         TaskDto[];
  totalCount:    number;
  criticalCount: number;
  highCount:     number;
}

export interface SprintSummaryDto {
  id:                   string;
  name:                 string;
  status:               string;
  endDate:              string;
  daysRemaining:        number;
  completionPercentage: number;
  aiRiskLevel:          string;
}

export interface TaskCommentDto {
  id:         string;
  authorId:   string;
  authorName: string | null;
  body:       string;
  createdAt:  string;
  updatedAt:  string | null;
}

export interface TimeLogDto {
  id:           string;
  loggedBy:     string;
  loggedByName: string | null;
  loggedAt:     string;
  hours:        number;
  description:  string | null;
}

export interface TaskDetailDto extends TaskDto {
  assigneeName: string | null;
  reporterName: string | null;
  comments:     TaskCommentDto[];
  timeLogs:     TimeLogDto[];
}

export interface CreateSprintRequest {
  projectId:  string;
  name:       string;
  goal:       string | null;
  startDate:  string;
  endDate:    string;
}

export interface CreateProjectRequest {
  name: string; description: string | null; departmentId: string | null;
  startDate: string | null; targetEndDate: string | null;
  budget: number | null; templateId: string | null; memberIds: string[] | null;
}

export interface CreateTaskRequest {
  projectId: string; title: string; description: string | null;
  assigneeId: string | null; dueDate: string | null; priority: TaskPriority;
  estimatedHours: number | null; tags: string[]; parentTaskId: string | null;
}

export interface UpdateTaskStatusRequest {
  taskId: string; newStatus: TaskStatus; newPosition: number;
}

export interface KanbanColumn {
  status: TaskStatus; label: string;
  dotColor: string; barColor: string;
  tasks: TaskDto[];
}

export const KANBAN_COLUMNS: Omit<KanbanColumn, 'tasks'>[] = [
  { status: 'ToDo',       label: 'To Do',       dotColor: '#94a3b8', barColor: '#cbd5e1' },
  { status: 'InProgress', label: 'In Progress',  dotColor: '#2563eb', barColor: '#60a5fa' },
  { status: 'Blocked',    label: 'Blocked',      dotColor: '#dc2626', barColor: '#f87171' },
  { status: 'InReview',   label: 'In Review',    dotColor: '#7c3aed', barColor: '#c4b5fd' },
  { status: 'Done',       label: 'Done',         dotColor: '#16a34a', barColor: '#86efac' },
];

export const PRIORITY_CONFIG: Record<TaskPriority, { text: string; bg: string; swatch: string; label: string }> = {
  Critical: { text: '#dc2626', bg: '#fef2f2', swatch: '#dc2626', label: 'Critical' },
  High:     { text: '#ea580c', bg: '#fff7ed', swatch: '#ea580c', label: 'High'     },
  Medium:   { text: '#d97706', bg: '#fffbeb', swatch: '#d97706', label: 'Medium'   },
  Low:      { text: '#16a34a', bg: '#f0fdf4', swatch: '#16a34a', label: 'Low'      },
};

export const TAG_CONFIG: Record<string, { text: string; bg: string }> = {
  default:  { text: '#475569', bg: '#f1f5f9' },
  auth:     { text: '#7c3aed', bg: '#f5f3ff' },
  billing:  { text: '#0284c7', bg: '#e0f2fe' },
  infra:    { text: '#334155', bg: '#eaeef3' },
  perf:     { text: '#334155', bg: '#eaeef3' },
  design:   { text: '#334155', bg: '#eaeef3' },
  data:     { text: '#334155', bg: '#eaeef3' },
  a11y:     { text: '#334155', bg: '#eaeef3' },
  frontend: { text: '#334155', bg: '#eaeef3' },
  backend:  { text: '#334155', bg: '#eaeef3' },
  pm:       { text: '#334155', bg: '#eaeef3' },
  board:    { text: '#334155', bg: '#eaeef3' },
};

// Workload data comes from backend - no hardcoded values
export const WORKLOAD_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];



export interface SubtaskDto {
  id:           string;
  taskId:       string;
  title:        string;
  done:         boolean;
  assigneeId:   string | null;
  assigneeName: string | null;
  dueDate:      string | null;
  order:        number;
  createdAt:    string;
}

export interface TaskActivityDto {
  id:        string;
  taskId:    string;
  actorId:   string;
  actorName: string;
  eventType: string;
  fieldName: string | null;
  fromValue: string | null;
  toValue:   string | null;
  createdAt: string;
}

export interface UpdateTaskRequest {
  taskId:          string;
  title:           string;
  description:     string | null;
  assigneeId:      string | null;
  dueDate:         string | null;
  priority:        string;
  estimatedHours:  number | null;
  tags:            string[];
}

export interface LogTimeRequest {
  taskId:      string;
  loggedAt:    string;
  hours:       number;
  description: string | null;
}

export interface CreateSubtaskRequest {
  title:      string;
  assigneeId: string | null;
  dueDate:    string | null;
  order:      number;
}
