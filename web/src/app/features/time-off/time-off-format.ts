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
/** An .ics file (works with Google, Outlook and Apple calendars) for whole-day events. */
export function icsFile(events: { title: string; from: string; to: string; note?: string }[]): Blob {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const d = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
  const esc = (s: string) => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WorkSphere//Time off//EN', 'CALSCALE:GREGORIAN'];
  events.forEach((e, i) => lines.push('BEGIN:VEVENT', `UID:${d(e.from)}-${i}-${Math.random().toString(36).slice(2)}@worksphere`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(e.from)}`, `DTEND;VALUE=DATE:${d(addDays(e.to, 1))}`, `SUMMARY:${esc(e.title)}`,
    ...(e.note ? [`DESCRIPTION:${esc(e.note)}`] : []), 'TRANSP:OPAQUE', 'END:VEVENT'));
  lines.push('END:VCALENDAR');
  return new Blob([lines.join('\r\n')], { type: 'text/calendar' });
}

export function statusText(r: LeaveRequest): string { return r.status === 'Rejected' ? 'Declined' : r.status; }
