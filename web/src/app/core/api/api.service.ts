import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, PagedResult } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(url: string, params?: Record<string, unknown>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined)
          httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http
      .get<ApiResponse<T>>(url, { params: httpParams })
      .pipe(map(r => r.data as T));
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(url, body)
      .pipe(map(r => r.data as T));
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(url, body)
      .pipe(map(r => r.data as T));
  }

  patch<T>(url: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(url, body)
      .pipe(map(r => r.data as T));
  }

  delete<T>(url: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(url)
      .pipe(map(r => r.data as T));
  }
}
