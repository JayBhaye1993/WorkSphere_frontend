import { OrgPerson } from '../../../core/models/people.models';

/** The company as a tree, built once from the flat list. */
export class OrgData {
  readonly byId = new Map<string, OrgPerson>();
  readonly children = new Map<string, OrgPerson[]>();
  /** People with no manager: the biggest team first (normally the CEO), then anyone whose manager isn't set. */
  readonly roots: OrgPerson[];

  constructor(people: OrgPerson[]) {
    for (const p of people) this.byId.set(p.id, p);
    for (const p of people) if (p.managerId && this.byId.has(p.managerId)) {
      const list = this.children.get(p.managerId) ?? []; list.push(p); this.children.set(p.managerId, list);
    }
    // Managers first (bigger teams), then by name.
    for (const list of this.children.values()) list.sort((a, b) => Number(b.teamSize > 0) - Number(a.teamSize > 0) || a.fullName.localeCompare(b.fullName));
    this.roots = people.filter(p => !p.managerId || !this.byId.has(p.managerId)).sort((a, b) => b.teamSize - a.teamSize || a.fullName.localeCompare(b.fullName));
  }

  get top(): OrgPerson | undefined { return this.roots[0]; }
  /** Everyone above, top first. */
  chain(id: string): OrgPerson[] {
    const out: OrgPerson[] = []; const seen = new Set<string>([id]);
    for (let m = this.byId.get(id)?.managerId; m && this.byId.has(m) && !seen.has(m); m = this.byId.get(m)!.managerId) { seen.add(m); out.unshift(this.byId.get(m)!); }
    return out;
  }
  reports(id: string): OrgPerson[] { return this.children.get(id) ?? []; }

  search(text: string, limit = 8): OrgPerson[] {
    const t = text.trim().toLowerCase(); if (!t) return [];
    const hits = [...this.byId.values()].filter(p => [p.fullName, p.designationName, p.departmentName, p.employeeCode].some(v => v?.toLowerCase().includes(t)));
    return hits.sort((a, b) => Number(!a.fullName.toLowerCase().startsWith(t)) - Number(!b.fullName.toLowerCase().startsWith(t)) || a.fullName.localeCompare(b.fullName)).slice(0, limit);
  }
}

const BANDS = ['#4f46e5', '#0d9488', '#d97706', '#db2777', '#0284c7', '#7c3aed', '#059669', '#ea580c', '#475569'];
/** A steady colour per top-level department (same department, same colour, everywhere). */
export function bandColor(id: string | null): string {
  if (!id) return '#cbd5e1';
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BANDS[h % BANDS.length];
}

export function teamLine(p: OrgPerson): string {
  if (!p.directReports) return '';
  const r = p.directReports === 1 ? '1 report' : `${p.directReports} reports`;
  return p.teamSize > p.directReports ? `${r} · ${p.teamSize} in team` : r;
}
