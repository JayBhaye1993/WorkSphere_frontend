import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';

/** Company lists (org.manage to change; anyone signed in may read). One generic CRUD over /api/v1/{path}. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);
  private readonly base = `${environment.apiUrls.employee}/api/v1`;

  list<T>(path: string, params?: Record<string, unknown>): Observable<T[]> { return this.api.get<T[]>(`${this.base}/${path}`, params); }
  create<T>(path: string, body: unknown): Observable<T> { return this.api.post<T>(`${this.base}/${path}`, body); }
  update<T>(path: string, id: string, body: unknown): Observable<T> { return this.api.put<T>(`${this.base}/${path}/${id}`, body); }
  remove(path: string, id: string): Observable<boolean> { return this.api.delete<boolean>(`${this.base}/${path}/${id}`); }
  get<T>(path: string): Observable<T> { return this.api.get<T>(`${this.base}/${path}`); }
  put<T>(path: string, body: unknown): Observable<T> { return this.api.put<T>(`${this.base}/${path}`, body); }
}
