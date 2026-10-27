/** Dates on exits are plain calendar days ("2026-11-26"), kept in India time like the server. */
export function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}
export function addDays(day: string, n: number): string {
  const d = new Date(day.slice(0, 10) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to.slice(0, 10) + 'T00:00:00Z') - Date.parse(from.slice(0, 10) + 'T00:00:00Z')) / 864e5);
}
export function fmtDay(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
