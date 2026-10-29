import { Half, LeaveRequest } from './time-off.models';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Calendar dates are plain days: always read and written as UTC midnight so no time zone shifts them. */
export function parseDay(iso: string): Date { return new Date(iso.slice(0, 10) + 'T00:00:00Z'); }
export function isoDay(d: Date): string { return d.toISOString().slice(0, 10); }
export function addDays(iso: string, n: number): string { const d = parseDay(iso); d.setUTCDate(d.getUTCDate() + n); return isoDay(d); }
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function weekday(iso: string): string { return DAYS[parseDay(iso).getUTCDay()]; }
export function fmt(iso: string, withYear = false): string {
  const d = parseDay(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ' ' + d.getUTCFullYear() : ''}`;
}
export function monthName(m: number): string { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]; }

export function halfLabel(h: Half): string { return h === 'First' ? 'first half' : h === 'Second' ? 'second half' : ''; }

/** "Mon 3 Nov", "3 – 5 Nov", "28 Oct – 2 Nov (from 2nd half)". */
export function range(r: { from: string; to: string; fromHalf: Half; toHalf: Half }): string {
  if (r.from === r.to) return `${weekday(r.from)} ${fmt(r.from)}${r.fromHalf ? ' · ' + halfLabel(r.fromHalf) : ''}`;
  const a = parseDay(r.from), b = parseDay(r.to);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const main = sameMonth ? `${a.getUTCDate()} – ${fmt(r.to)}` : `${fmt(r.from)} – ${fmt(r.to)}`;
  const notes = [r.fromHalf ? 'starts after lunch' : '', r.toHalf ? 'ends at lunch' : ''].filter(x => x).join(', ');
  return notes ? `${main} (${notes})` : main;
}

export function days(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  const v = Number(n);
  const t = Number.isInteger(v) ? String(v) : v.toFixed(v * 2 === Math.round(v * 2) ? 1 : 2);
  return `${t} ${Math.abs(v) === 1 ? 'day' : 'days'}`;
}
export function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(v * 2 === Math.round(v * 2) ? 1 : 2);
}

export const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};
export function statusText(r: LeaveRequest): string { return r.status === 'Rejected' ? 'Declined' : r.status; }
