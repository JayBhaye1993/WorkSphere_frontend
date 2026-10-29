import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';
import {
  CompOffClaim, EmployeeTimeOff, Holiday, HolidayInput, LeaveCalendar, LeaveInput, LeavePreview, LeaveRequest, LeaveSettings,
  LeaveType, LeaveTypeInput, LeaveTypeOption, MyTimeOff,
} from './time-off.models';

/** Time off (HR service). Permission checks happen on the server; the UI only hides what can't be used. */
@Injectable({ providedIn: 'root' })
export class TimeOffService {
  private readonly api = inject(ApiService);
  private readonly base = `${environment.apiUrls.hr}/api/v1/leave`;

  me(year?: number): Observable<MyTimeOff> { return this.api.get(`${this.base}/me`, { year }); }
  options(employeeId?: string | null): Observable<LeaveTypeOption[]> { return this.api.get(`${this.base}/options`, { employeeId }); }
  preview(i: LeaveInput): Observable<LeavePreview> { return this.api.post(`${this.base}/preview`, i); }
  apply(i: LeaveInput): Observable<LeaveRequest> { return this.api.post(`${this.base}/requests`, i); }
  cancel(id: string): Observable<LeaveRequest> { return this.api.post(`${this.base}/requests/${id}/cancel`, {}); }
  approve(id: string, note?: string | null): Observable<LeaveRequest> { return this.api.post(`${this.base}/requests/${id}/approve`, { note: note || null }); }
  reject(id: string, reason: string): Observable<LeaveRequest> { return this.api.post(`${this.base}/requests/${id}/reject`, { reason }); }
  approvals(): Observable<LeaveRequest[]> { return this.api.get(`${this.base}/approvals`); }
  calendar(from: string, to: string, scope: 'team' | 'all'): Observable<LeaveCalendar> { return this.api.get(`${this.base}/calendar`, { from, to, scope }); }
  employee(id: string, year?: number): Observable<EmployeeTimeOff> { return this.api.get(`${this.base}/employees/${id}`, { year }); }
  adjust(id: string, body: { leaveTypeId: string; year: number; days: number; note: string }): Observable<EmployeeTimeOff> {
    return this.api.post(`${this.base}/employees/${id}/adjust`, body);
  }

  claimCompOff(b: { employeeId?: string | null; workedDate: string; days: number; reason: string }): Observable<CompOffClaim> { return this.api.post(`${this.base}/comp-off`, b); }
  myCompOff(): Observable<CompOffClaim[]> { return this.api.get(`${this.base}/comp-off/mine`); }
  compOffApprovals(): Observable<CompOffClaim[]> { return this.api.get(`${this.base}/comp-off/approvals`); }
  approveCompOff(id: string): Observable<CompOffClaim> { return this.api.post(`${this.base}/comp-off/${id}/approve`, {}); }
  rejectCompOff(id: string, reason: string): Observable<CompOffClaim> { return this.api.post(`${this.base}/comp-off/${id}/reject`, { reason }); }
  cancelCompOff(id: string): Observable<CompOffClaim> { return this.api.post(`${this.base}/comp-off/${id}/cancel`, {}); }

  settings(): Observable<LeaveSettings> { return this.api.get(`${this.base}/settings`); }
  saveSettings(s: { weekendDays: number[]; yearStartMonth: number }): Observable<LeaveSettings> { return this.api.put(`${this.base}/settings`, s); }
  types(): Observable<LeaveType[]> { return this.api.get(`${this.base}/types`); }
  createType(t: LeaveTypeInput): Observable<LeaveType> { return this.api.post(`${this.base}/types`, t); }
  updateType(id: string, t: LeaveTypeInput): Observable<LeaveType> { return this.api.put(`${this.base}/types/${id}`, t); }
  deleteType(id: string): Observable<boolean> { return this.api.delete(`${this.base}/types/${id}`); }
  reorderTypes(ids: string[]): Observable<boolean> { return this.api.put(`${this.base}/types/order`, { ids }); }
  holidays(year: number, mine = false): Observable<Holiday[]> { return this.api.get(`${this.base}/holidays`, { year, mine }); }
  createHoliday(h: HolidayInput): Observable<Holiday> { return this.api.post(`${this.base}/holidays`, h); }
  updateHoliday(id: string, h: HolidayInput): Observable<Holiday> { return this.api.put(`${this.base}/holidays/${id}`, h); }
  deleteHoliday(id: string): Observable<boolean> { return this.api.delete(`${this.base}/holidays/${id}`); }
}
