import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';
import { CustomField, Department, DirectoryEntry, Employee, Paged } from '../../core/models/people.models';

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

  departments(): Observable<Department[]> {
    return this.api.get<Department[]>(`${this.base}/departments`);
  }

  customFields(): Observable<CustomField[]> {
    return this.api.get<CustomField[]>(`${this.base}/custom-fields`);
  }
}
