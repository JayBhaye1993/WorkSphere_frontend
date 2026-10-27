import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response.model';
import { fileNameFrom } from '../../core/util/download';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';
import { ChangeEntry, ExitCase, ExitInput, ExitReason, ImportPreview, ImportResult, CreateEmployee, CustomField, JobRecord, Department, Designation, DirectoryEntry, Employee, EmployeeSettings, EmploymentType, Grade, Location, Paged, UpdateEmployee, UpdateMyProfile } from '../../core/models/people.models';

@Injectable({ providedIn: 'root' })
export class PeopleService {
  private readonly api = inject(ApiService);
  private readonly base = `${environment.apiUrls.employee}/api/v1`;

  /** Everyone active; search also matches title, code and non-private company fields. A department includes its sub-teams. */
  /** show: 'leaving' (serving notice) or 'former' (left); HR only (employees.exit), ignored for others. */
  directory(q: { search?: string; departmentId?: string | null; locationId?: string | null; page?: number; pageSize?: number; show?: 'leaving' | 'former' | null }): Observable<Paged<DirectoryEntry>> {
    return this.api.get<Paged<DirectoryEntry>>(`${this.base}/employees/directory`, {
      search: q.search?.trim() || null, departmentId: q.departmentId, locationId: q.locationId,
      page: q.page ?? 1, pageSize: q.pageSize ?? 30, show: q.show ?? null,
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

  /** Change log, newest first. Private changes only for HR and the person. */
  history(id: string, page = 1, pageSize = 50): Observable<Paged<ChangeEntry>> {
    return this.api.get<Paged<ChangeEntry>>(`${this.base}/employees/${id}/history`, { page, pageSize });
  }

  /** Career steps, newest first. */
  timeline(id: string): Observable<JobRecord[]> {
    return this.api.get<JobRecord[]>(`${this.base}/employees/${id}/timeline`);
  }

  departments(): Observable<Department[]> {
    return this.api.get<Department[]>(`${this.base}/departments`);
  }

  customFields(): Observable<CustomField[]> {
    return this.api.get<CustomField[]>(`${this.base}/custom-fields`);
  }

  // ── Exit and offboarding ──
  /** The person's latest exit, or null. HR, the person and their managers. */
  exit(id: string): Observable<ExitCase | null> { return this.api.get<ExitCase | null>(`${this.base}/employees/${id}/exit`); }
  startExit(id: string, body: ExitInput): Observable<ExitCase> { return this.api.post<ExitCase>(`${this.base}/employees/${id}/exit`, body); }
  updateExit(id: string, body: ExitInput): Observable<ExitCase> { return this.api.put<ExitCase>(`${this.base}/employees/${id}/exit`, body); }
  withdrawExit(id: string, note: string | null): Observable<ExitCase> { return this.api.post<ExitCase>(`${this.base}/employees/${id}/exit/withdraw`, { note }); }
  completeExit(id: string, rehireEligible: boolean | null): Observable<ExitCase> { return this.api.post<ExitCase>(`${this.base}/employees/${id}/exit/complete`, { rehireEligible }); }
  addExitTask(id: string, title: string, owner: string): Observable<ExitCase> { return this.api.post<ExitCase>(`${this.base}/employees/${id}/exit/tasks`, { title, owner }); }
  updateExitTask(id: string, taskId: string, body: { done?: boolean; note?: string }): Observable<ExitCase> { return this.api.patch<ExitCase>(`${this.base}/employees/${id}/exit/tasks/${taskId}`, body); }
  deleteExitTask(id: string, taskId: string): Observable<ExitCase> { return this.api.delete<ExitCase>(`${this.base}/employees/${id}/exit/tasks/${taskId}`); }
  exitReasons(): Observable<ExitReason[]> { return this.api.get<ExitReason[]>(`${this.base}/exit-reasons`); }

  // ── Excel: export, template, import ──
  private readonly http = inject(HttpClient);
  private file(url: string, params: Record<string, unknown>, fallback: string): Observable<{ blob: Blob; name: string }> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    return this.http.get(url, { params: p, responseType: 'blob', observe: 'response' })
      .pipe(map(r => ({ blob: r.body!, name: fileNameFrom(r.headers.get('Content-Disposition'), fallback) })));
  }
  /** The people the caller may see, filtered like the list. */
  exportPeople(q: { search?: string; departmentId?: string | null; locationId?: string | null; show?: string | null }) {
    return this.file(`${this.base}/employees/export`, { search: q.search?.trim(), departmentId: q.departmentId, locationId: q.locationId, show: q.show }, 'WorkSphere-people.xlsx');
  }
  importTemplate() { return this.file(`${this.base}/employees/import/template`, {}, 'WorkSphere-import-template.xlsx'); }
  private form(file: File, opts: Record<string, boolean>) {
    const f = new FormData(); f.append('file', file, file.name);
    for (const [k, v] of Object.entries(opts)) f.append(k, String(v));
    return f;
  }
  /** Checks the file; nothing is saved. */
  previewImport(file: File, updateExisting: boolean): Observable<ImportPreview> {
    return this.http.post<ApiResponse<ImportPreview>>(`${this.base}/employees/import/preview`, this.form(file, { updateExisting })).pipe(map(r => r.data as ImportPreview));
  }
  runImport(file: File, updateExisting: boolean, inviteToLogin: boolean): Observable<ImportResult> {
    return this.http.post<ApiResponse<ImportResult>>(`${this.base}/employees/import`, this.form(file, { updateExisting, inviteToLogin })).pipe(map(r => r.data as ImportResult));
  }
}
