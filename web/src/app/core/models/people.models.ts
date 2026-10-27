// Shapes returned by the Employee service (see Employee.Application DTOs). Keep in step with the API.

export interface DirectoryEntry {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  designationName: string | null;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
  profilePhotoUrl: string | null;
  employeeCode: string;
  locationName: string | null;
  /** Active or Exited. */
  status?: string;
  /** Last working day: while serving notice, or the day they left. Only for HR, the person and their managers. */
  leavingOn?: string | null;
}

/** Full profile; personal fields arrive only for the person, HR, or anyone with employees.sensitive. */
export interface Employee {
  id: string;
  userId: string | null;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  managerId: string | null;
  managerName: string | null;
  employmentType: string | null;
  employmentTypeId: string | null;
  joiningDate: string;
  confirmationDate: string | null;
  status: string;
  profilePhotoUrl: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  locationId: string | null;
  locationName: string | null;
  gradeId: string | null;
  gradeName: string | null;
  customFields: Record<string, unknown> | null;
}

export interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  parentName: string | null;
  headEmployeeId: string | null;
  headName: string | null;
  employeeCount: number;
  teamEmployeeCount: number;
}

export type CustomFieldType = 'Text' | 'Number' | 'Date' | 'Select' | 'MultiSelect' | 'Boolean';

export interface CustomField {
  id: string;
  key: string;
  name: string;
  fieldType: CustomFieldType;
  options: string[];
  isRequired: boolean;
  isSensitive: boolean;
  section: string;
  sortOrder: number;
  isActive: boolean;
  employeeEditable: boolean;
  employeeCount: number;
}

export interface Designation { id: string; name: string; level: number; employeeCount: number; }
export interface Location { id: string; name: string; city: string | null; state: string | null; country: string; timezone: string; isActive: boolean; employeeCount: number; }
export interface Grade { id: string; name: string; level: number; description: string | null; employeeCount: number; }
export interface EmploymentType { id: string; name: string; description: string | null; probationMonths: number; noticePeriodDays: number; isDefault: boolean; employeeCount: number; }
export interface EmployeeSettings { codePrefix: string; codePadding: number; nextCodeNumber: number; nextCodePreview: string; }

/** PUT /employees/me — personal details plus company fields marked "employee can edit". Empty string clears a text value. */
export interface UpdateMyProfile {
  phone?: string; gender?: string; address?: string; emergencyContact?: string; emergencyPhone?: string;
  dateOfBirth?: string | null; customFields?: Record<string, unknown>;
}

/** POST /employees (employees.create). The code is generated when left out. */
export interface CreateEmployee {
  fullName: string; email: string; joiningDate: string;
  departmentId?: string | null; designationId?: string | null; managerId?: string | null; phone?: string | null;
  locationId?: string | null; gradeId?: string | null; employmentTypeId?: string | null;
  customFields?: Record<string, unknown>; inviteToLogin: boolean;
}

/** PUT /employees/{id} (employees.edit). Null leaves a value unchanged; clearManager removes the manager. */
export interface UpdateEmployee {
  departmentId?: string | null; designationId?: string | null; managerId?: string | null; clearManager?: boolean;
  phone?: string | null; locationId?: string | null; gradeId?: string | null; employmentTypeId?: string | null;
  customFields?: Record<string, unknown>;
  /** When a job change takes effect (yyyy-MM-ddT00:00:00Z); default today. */
  effectiveDate?: string | null;
  changeReason?: string | null;
  changeNote?: string | null;
}

/** One field changed on one save (GET /employees/{id}/history). Rows of one save share batchId. */
export interface ChangeEntry {
  id: string; batchId: string; changedAt: string; changedByName: string; source: 'HR' | 'Self' | 'System' | 'Import';
  field: string; label: string; oldValue: string | null; newValue: string | null; isSensitive: boolean;
}

/** One career step (GET /employees/{id}/timeline), newest first. */
export interface JobRecord {
  id: string; effectiveDate: string; kind: string; note: string | null;
  designationName: string | null; departmentName: string | null; managerId: string | null; managerName: string | null;
  gradeName: string | null; locationName: string | null; employmentTypeName: string | null;
  recordedByName: string; recordedAt: string;
}

export interface ExitTask { id: string; title: string; owner: string; done: boolean; doneAt: string | null; doneByName: string | null; note: string | null; }

/** One exit (GET /employees/{id}/exit). note and rehireEligible are HR-only (null for others). */
export interface ExitCase {
  id: string; employeeId: string; exitType: string; noticeDate: string; lastWorkingDay: string;
  noticePeriodDays: number; shortenedByDays: number; reasonId: string | null; reasonName: string | null;
  note: string | null; rehireEligible: boolean | null; status: 'Serving' | 'Completed' | 'Withdrawn';
  startedByName: string; startedAt: string; closedAt: string | null; closedByName: string | null; withdrawNote: string | null;
  daysLeft: number; tasksDone: number; tasks: ExitTask[]; canManage: boolean;
}
export interface ExitInput { exitType: string; noticeDate: string; lastWorkingDay: string; reasonId: string | null; note: string | null; rehireEligible?: boolean | null; }
export interface ExitReason { id: string; name: string; sortOrder: number; usageCount: number; }
export const EXIT_TYPES = ['Resignation', 'Termination', 'Retirement', 'Contract end', 'Other'] as const;
export const TASK_OWNERS = ['HR', 'Manager', 'IT', 'Finance', 'Employee'] as const;

export interface ImportIssue { column: string; message: string; }
export interface ImportRow { row: number; action: 'Add' | 'Update' | 'Unchanged' | 'Error'; name: string; email: string; changes: string[]; issues: ImportIssue[]; }
export interface ImportPreview { total: number; toAdd: number; toUpdate: number; unchanged: number; withErrors: number; rows: ImportRow[]; ignoredColumns: string[]; errorFileBase64: string | null; }
export interface ImportResult { added: number; updated: number; unchanged: number; failed: number; failures: ImportRow[]; errorFileBase64: string | null; }

export const CHANGE_REASONS = ['Promotion', 'Transfer', 'Manager change', 'Role change', 'Relocation', 'Correction'] as const;

export interface Paged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
