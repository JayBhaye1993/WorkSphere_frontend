import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface EmployeeDto {
  id: string;
  fullName: string;
  email: string;
  designation?: string;
  departmentName?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.employee;

  search(query: string, pageSize = 10): Observable<EmployeeDto[]> {
    return this.http
      .get<any>(`${this.base}/api/v1/employees?search=${encodeURIComponent(query)}&pageSize=${pageSize}`)
      .pipe(map(r => r.data?.items ?? []));
  }
}

