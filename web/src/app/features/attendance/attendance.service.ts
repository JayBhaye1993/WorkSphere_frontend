import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { fileNameFrom } from '../../core/util/download';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';

export type DayStatus = 'Present' | 'Late' | 'HalfDay' | 'Short' | 'Absent' | 'Missing' | 'Working' | 'NotYet' | 'Leave' | 'HalfLeave'
  | 'Holiday' | 'Weekend' | 'Upcoming' | 'NotJoined' | 'NoRecord' | 'WFH';
export interface AttDay { date: string; status: DayStatus; label: string; in: string | null; out: string | null; workedMinutes: number; lateMinutes: number; punches: number; shiftName: string | null; late: boolean; detail: string | null;
  wfh: boolean; pending: 'Correction' | 'WorkFromHome' | null; overtimeMinutes: number; }
export interface AttSummary { present: number; late: number; halfDays: number; absent: number; onLeave: number; missing: number; workedMinutes: number; averageMinutes: number; wfh: number; overtimeMinutes: number; }
export interface ShiftInfo { id: string | null; name: string; start: string; end: string; graceMinutes: number; fullDayHours: number; halfDayHours: number; isNight: boolean; }
export interface Today { checkedIn: boolean; since: string | null; lastPunch: string | null; punches: number; workedMinutes: number; nextAction: string; }
export interface AttMonth { employeeId: string; name: string; month: string; shift: ShiftInfo; days: AttDay[]; summary: AttSummary; today: Today | null; canCorrect: boolean; }
export interface TeamRow { employeeId: string; name: string; designation: string | null; day: AttDay; }
export interface TeamToday { date: string; people: TeamRow[]; counts: Record<string, number>; canSeeAll: boolean; }
export interface PunchItem { id: string; at: string; time: string; source: string; deviceName: string | null; addedByName: string | null; note: string | null; latitude: number | null; longitude: number | null; canRemove: boolean; }
export interface Shift { id: string; name: string; start: string; end: string; graceMinutes: number; fullDayHours: number; halfDayHours: number; breakMinutes: number; isDefault: boolean; isActive: boolean; isNight: boolean; color: string; locations: number; people: number; }
export interface ShiftInput { name: string; start: string; end: string; graceMinutes: number; fullDayHours: number; halfDayHours: number; breakMinutes: number; isActive: boolean; color: string; }
export interface Assignment { targetType: 'Location' | 'Employee'; targetId: string; shiftId: string; }
export interface Device { id: string; name: string; serialNumber: string; brand: string | null; locationId: string | null; protocol: 'Push' | 'Agent' | 'Import'; isActive: boolean; lastSeenAt: string | null; lastPunchAt: string | null; punchCount: number; online: boolean; hasKey: boolean; key: string | null; }
export interface DeviceInput { name: string; serialNumber: string; brand: string | null; locationId: string | null; protocol: string; isActive: boolean; }
export interface Unmatched { attendanceId: string; punches: number; lastAt: string; deviceName: string | null; }
export type RequestKind = 'Correction' | 'WorkFromHome';
export interface AttRequest { id: string; employeeId: string; employeeName: string; kind: RequestKind; fromDate: string; toDate: string; datesLabel: string;
  inTime: string | null; outTime: string | null; days: number; reason: string; status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  appliedByName: string | null; decidedByName: string | null; decidedAt: string | null; decisionNote: string | null; createdAt: string; canCancel: boolean; canDecide: boolean; }
export interface AttRequestInput { kind: RequestKind; fromDate: string; toDate?: string | null; inTime?: string | null; outTime?: string | null; reason: string; }
export interface AttRules { correctionDaysBack: number; correctionsPerMonth: number | null; wfhEnabled: boolean; wfhNeedsCheckIn: boolean; wfhDaysPerMonth: number | null;
  overtimeToCompOff: boolean; compOffAvailable: boolean; remindCheckIn: boolean; checkInReminderMinutes: number; remindCheckOut: boolean; checkOutReminderMinutes: number; canManage: boolean; }
export type AttRulesInput = Omit<AttRules, 'compOffAvailable' | 'canManage'>;
export interface PersonId { employeeId: string; name: string; employeeCode: string | null; biometricId: string | null; attendanceId: string | null; isActive: boolean; }

/** Attendance (HR service): punches from phone, web, HR and machines; days are worked out on the server. */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrls.hr}/api/v1/attendance`;

  me(month?: string): Observable<AttMonth> { return this.api.get(`${this.base}/me`, { month }); }
  employee(id: string, month?: string): Observable<AttMonth> { return this.api.get(`${this.base}/employees/${id}`, { month }); }
  punch(source: 'Web' | 'Mobile', latitude?: number | null, longitude?: number | null): Observable<Today> { return this.api.post(`${this.base}/punch`, { source, latitude, longitude }); }
  teamToday(scope: 'team' | 'all'): Observable<TeamToday> { return this.api.get(`${this.base}/team/today`, { scope }); }
  punches(id: string, date: string): Observable<PunchItem[]> { return this.api.get(`${this.base}/employees/${id}/punches`, { date }); }
  addPunch(employeeId: string, at: string, note: string): Observable<PunchItem[]> { return this.api.post(`${this.base}/punches`, { employeeId, at, note }); }
  removePunch(id: string): Observable<boolean> { return this.api.delete(`${this.base}/punches/${id}`); }

  shifts(): Observable<Shift[]> { return this.api.get(`${this.base}/shifts`); }
  createShift(s: ShiftInput): Observable<Shift> { return this.api.post(`${this.base}/shifts`, s); }
  updateShift(id: string, s: ShiftInput): Observable<Shift> { return this.api.put(`${this.base}/shifts/${id}`, s); }
  deleteShift(id: string): Observable<boolean> { return this.api.delete(`${this.base}/shifts/${id}`); }
  makeDefault(id: string): Observable<boolean> { return this.api.post(`${this.base}/shifts/${id}/default`, {}); }
  assignments(): Observable<Assignment[]> { return this.api.get(`${this.base}/shift-assignments`); }
  assign(targetType: 'Location' | 'Employee', targetId: string, shiftId: string | null): Observable<boolean> { return this.api.put(`${this.base}/shift-assignments`, { targetType, targetId, shiftId }); }

  devices(): Observable<Device[]> { return this.api.get(`${this.base}/devices`); }
  addDevice(d: DeviceInput): Observable<Device> { return this.api.post(`${this.base}/devices`, d); }
  updateDevice(id: string, d: DeviceInput): Observable<Device> { return this.api.put(`${this.base}/devices/${id}`, d); }
  deleteDevice(id: string): Observable<boolean> { return this.api.delete(`${this.base}/devices/${id}`); }
  newKey(id: string): Observable<Device> { return this.api.post(`${this.base}/devices/${id}/key`, {}); }
  unmatched(): Observable<Unmatched[]> { return this.api.get(`${this.base}/devices/unmatched`); }
  ids(): Observable<PersonId[]> { return this.api.get(`${this.base}/ids`); }
  setId(employeeId: string, biometricId: string | null): Observable<PersonId> { return this.api.put(`${this.base}/ids/${employeeId}`, { biometricId }); }

  ask(r: AttRequestInput): Observable<AttRequest> { return this.api.post(`${this.base}/requests`, r); }
  myRequests(): Observable<AttRequest[]> { return this.api.get(`${this.base}/requests/mine`); }
  approvals(): Observable<AttRequest[]> { return this.api.get(`${this.base}/requests/approvals`); }
  approve(id: string): Observable<AttRequest> { return this.api.post(`${this.base}/requests/${id}/approve`, {}); }
  decline(id: string, reason: string): Observable<AttRequest> { return this.api.post(`${this.base}/requests/${id}/decline`, { reason }); }
  cancel(id: string): Observable<AttRequest> { return this.api.post(`${this.base}/requests/${id}/cancel`, {}); }

  rules(): Observable<AttRules> { return this.api.get(`${this.base}/rules`); }
  saveRules(r: AttRulesInput): Observable<AttRules> { return this.api.put(`${this.base}/rules`, r); }
  scanOvertime(days = 7): Observable<{ checked: number; raised: number }> { return this.api.post(`${this.base}/overtime/scan?days=${days}`, {}); }
  register(month: string, scope: 'team' | 'all'): Observable<{ blob: Blob; name: string }> {
    return this.http.get(`${this.base}/register`, { params: { month, scope }, responseType: 'blob', observe: 'response' })
      .pipe(map(r => ({ blob: r.body!, name: fileNameFrom(r.headers.get('Content-Disposition'), `attendance-${month}.xlsx`) })));
  }
}

export const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Present: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: '#10b981', label: 'Present' },
  Late: { bg: 'bg-amber-50', text: 'text-amber-800', dot: '#f59e0b', label: 'Late' },
  HalfDay: { bg: 'bg-sky-50', text: 'text-sky-800', dot: '#0ea5e9', label: 'Half day' },
  Short: { bg: 'bg-orange-50', text: 'text-orange-800', dot: '#f97316', label: 'Short hours' },
  Absent: { bg: 'bg-rose-50', text: 'text-rose-800', dot: '#e11d48', label: 'Absent' },
  Missing: { bg: 'bg-orange-50', text: 'text-orange-800', dot: '#f97316', label: 'Missing punch' },
  Working: { bg: 'bg-indigo-50', text: 'text-indigo-800', dot: '#4f46e5', label: 'In now' },
  NotYet: { bg: 'bg-white', text: 'text-slate-600', dot: '#94a3b8', label: 'Not in yet' },
  Leave: { bg: 'bg-violet-50', text: 'text-violet-800', dot: '#8b5cf6', label: 'On leave' },
  HalfLeave: { bg: 'bg-violet-50', text: 'text-violet-800', dot: '#a78bfa', label: 'Half-day leave' },
  Holiday: { bg: 'bg-teal-50', text: 'text-teal-800', dot: '#14b8a6', label: 'Holiday' },
  Weekend: { bg: 'bg-slate-50', text: 'text-slate-500', dot: '#cbd5e1', label: 'Weekend' },
  WFH: { bg: 'bg-cyan-50', text: 'text-cyan-800', dot: '#06b6d4', label: 'Work from home' },
  Upcoming: { bg: 'bg-white', text: 'text-slate-400', dot: '#e2e8f0', label: '' },
  NotJoined: { bg: 'bg-white', text: 'text-slate-300', dot: '#f1f5f9', label: '' },
  NoRecord: { bg: 'bg-white', text: 'text-slate-400', dot: '#f1f5f9', label: 'Before attendance started' },
};
export function hm(min: number): string { if (!min) return '0h'; const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h ${m}m` : `${h}h`; }
