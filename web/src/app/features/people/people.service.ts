import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';
import { CreateEmployee, CustomField, Department, Designation, DirectoryEntry, Employee, EmployeeSettings, EmploymentType, Grade, Location, Paged, UpdateEmployee, UpdateMyProfile } from '../../core/models/people.models';

@Injectable({ providedIn: 'root' })
export class PeopleService {
  private readonly api = inject(ApiService);
  private readonly base = `${environment.apiUrls.employee}/api/v1`;

  /** Everyone active; search also matches title, code and non-private company fields. A department includes its sub-teams. */
  directory(q: { search?: string; departmentId?: string | null; locationId?: string | null; page?: number; pageSize?: number }): Observable<Paged<DirectoryEntry>> {
    return this.api.get<Paged<DirectoryEntry>>(`${this.base}/employees/directory`, {
      search: q.search?.trim() || null, departmentId: q.departmentId, locationId: q.locationId,
      page: q.page ?? 1, pageSize: q.pageSize ?? 30,
    });
  }

  /** A colleague's basic card (anyone signed in). */
  card(id: string): Observable<DirectoryEntry> {
    return this.api.get<DirectoryEntry>(`${this.base}/employees/directory/${id}`);
  }

  /** Full profile; 404 when outside the caller's employees.view scope. */
  employee(id: string): Observable<Employee> {
    return this.api.get<Employee>(`${this.base}/employees/${id}`);
  }

  me(): Observable<Employee> {
    return this.api.get<Employee>(`${this.base}/employees/me`);
  }

  updateMe(body: UpdateMyProfile): Observable<Employee> {
    return this.api.put<Employee>(`${this.base}/employees/me`, body);
  }

  create(body: CreateEmployee): Observable<Employee> {
    return this.api.post<Employee>(`${this.base}/employees`, body);
  }

  update(id: string, body: UpdateEmployee): Observable<Employee> {
    return this.api.put<Employee>(`${this.base}/employees/${id}`, body);
  }

  designations(): Observable<Designation[]> { return this.api.get<Designation[]>(`${this.base}/designations`); }
  locations(): Observable<Location[]> { return this.api.get<Location[]>(`${this.base}/locations`); }
  grades(): Observable<Grade[]> { return this.api.get<Grade[]>(`${this.base}/grades`); }
  employmentTypes(): Observable<EmploymentType[]> { return this.api.get<EmploymentType[]>(`${this.base}/employment-types`); }
  employeeSettings(): Observable<EmployeeSettings> { return this.api.get<EmployeeSettings>(`${this.base}/employee-settings`); }

  departments(): Observable<Department[]> {
    return this.api.get<Department[]>(`${this.base}/departments`);
  }

  customFields(): Observable<CustomField[]> {
    return this.api.get<CustomField[]>(`${this.base}/custom-fields`);
  }
}
