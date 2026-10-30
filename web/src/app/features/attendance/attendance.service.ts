import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';

export type DayStatus = 'Present' | 'Late' | 'HalfDay' | 'Short' | 'Absent' | 'Missing' | 'Working' | 'NotYet' | 'Leave' | 'HalfLeave'
  | 'Holiday' | 'Weekend' | 'Upcoming' | 'NotJoined' | 'NoRecord';
export interface AttDay { date: string; status: DayStatus; label: string; in: string | null; out: string | null; workedMinutes: number; lateMinutes: number; punches: number; shiftName: string | null; late: boolean; detail: string | null; }
export interface AttSummary { present: number; late: number; halfDays: number; absent: number; onLeave: number; missing: number; workedMinutes: number; averageMinutes: number; }
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
export interface PersonId { employeeId: string; name: string; employeeCode: string | null; biometricId: string | null; attendanceId: string | null; isActive: boolean; }

/** Attendance (HR service): punches from phone, web, HR and machines; days are worked out on the server. */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly api = inject(ApiService);
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
  Upcoming: { bg: 'bg-white', text: 'text-slate-400', dot: '#e2e8f0', label: '' },
  NotJoined: { bg: 'bg-white', text: 'text-slate-300', dot: '#f1f5f9', label: '' },
  NoRecord: { bg: 'bg-white', text: 'text-slate-400', dot: '#f1f5f9', label: 'Before attendance started' },
};
export function hm(min: number): string { if (!min) return '0h'; const h = Math.floor(min / 60), m = min % 60; return m ? `${h}h ${m}m` : `${h}h`; }
