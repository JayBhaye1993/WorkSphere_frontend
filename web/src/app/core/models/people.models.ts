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
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
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

export interface Paged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
