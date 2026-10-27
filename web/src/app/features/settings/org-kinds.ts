// Describes each company list the generic settings screen can manage.
// Adding a new kind of list = one entry here (fields, row, API body, delete rule).

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
export interface Option { value: string; label: string; }
export interface FieldDef {
  key: string; label: string; type: FieldType; required?: boolean; min?: number; max?: number;
  hint?: string; placeholder?: string; editOnly?: boolean;
  /** Why this field cannot be changed for the item being edited, or null. */
  locked?: (editing: any | null) => string | null;
  /** Options for selects; gets all items and the item being edited (to exclude itself). */
  options?: (all: any[], editing: any | null) => Option[];
}
export interface Row { title: string; sub: string; badge?: string; muted?: boolean; }
export interface KindDef {
  path: string; title: string; singular: string; intro: string;
  fields: FieldDef[];
  sort: (a: any, b: any) => number;
  row: (item: any, all: any[]) => Row;
  /** Form values for a new item, or from an existing one. */
  init: (item: any | null) => Record<string, any>;
  /** API body from form values. */
  body: (v: Record<string, any>, item: any | null) => unknown;
  /** Why it cannot be deleted right now, or null. */
  blocked: (item: any, all: any[]) => string | null;
  /** What deleting means (default: no one uses it). */
  deleteNote?: (item: any) => string;
  /** The list has a meaningful order the company sets (up/down buttons; PUT {path}/order with all ids). */
  reorder?: boolean;
}

const OWNERS: Option[] = ['HR', 'Manager', 'IT', 'Finance', 'Employee'].map(o => ({ value: o, label: o === 'Employee' ? 'The person leaving' : o }));
const people = (n: number) => n === 0 ? 'Not used yet' : n === 1 ? '1 person' : `${n} people`;
const num = (v: any) => v === '' || v === null || v === undefined ? 0 : Number(v);

export const TIMEZONES: Option[] = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Toronto', 'Australia/Sydney', 'UTC',
].map(z => ({ value: z, label: z.replace('_', ' ') }));

function deptPath(d: any, all: any[]): string {
  const byId = new Map(all.map(x => [x.id, x]));
  const parts = [d.name]; const seen = new Set([d.id]);
  for (let p = d.parentDepartmentId; p && byId.has(p) && !seen.has(p); p = byId.get(p).parentDepartmentId) { seen.add(p); parts.unshift(byId.get(p).name); }
  return parts.join(' › ');
}
function descendants(id: string, all: any[]): Set<string> {
  const out = new Set<string>([id]);
  for (let grew = true; grew;) { grew = false; for (const d of all) if (d.parentDepartmentId && out.has(d.parentDepartmentId) && !out.has(d.id)) { out.add(d.id); grew = true; } }
  return out;
}

export const KINDS: Record<string, KindDef> = {
  departments: {
    path: 'departments', title: 'Teams', singular: 'team',
    intro: 'Departments and the teams inside them. People in a sub-team also count towards its parent.',
    fields: [
      { key: 'name', label: 'Team name', type: 'text', required: true, placeholder: 'e.g. Platform' },
      { key: 'parentDepartmentId', label: 'Part of', type: 'select', hint: 'Leave empty for a top-level department.',
        options: (all, editing) => {
          const banned = editing ? descendants(editing.id, all) : new Set<string>();
          return all.filter(d => !banned.has(d.id)).map(d => ({ value: d.id, label: deptPath(d, all) })).sort((a, b) => a.label.localeCompare(b.label));
        } },
    ],
    sort: (a, b) => a._path.localeCompare(b._path),
    row: (d, all) => {
      const kids = all.filter(x => x.parentDepartmentId === d.id).length;
      return { title: deptPath(d, all), sub: [people(d.employeeCount), kids ? `${d.teamEmployeeCount} incl. ${kids} sub-team${kids > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') };
    },
    init: d => ({ name: d?.name ?? '', parentDepartmentId: d?.parentDepartmentId ?? '' }),
    body: (v, d) => ({ name: v['name'].trim(), parentDepartmentId: v['parentDepartmentId'] || null, headEmployeeId: d?.headEmployeeId ?? null }),
    blocked: (d, all) => {
      const kids = all.filter(x => x.parentDepartmentId === d.id).length;
      if (kids) return `${d.name} has ${kids} sub-team${kids > 1 ? 's' : ''}. Move or delete them first.`;
      if (d.employeeCount) return `${people(d.employeeCount)} ${d.employeeCount === 1 ? 'is' : 'are'} in ${d.name}. Move them to another team first.`;
      return null;
    },
  },
  designations: {
    path: 'designations', title: 'Job titles', singular: 'job title',
    intro: 'The titles people hold. Level orders them from junior to senior.',
    fields: [
      { key: 'name', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Senior Software Engineer' },
      { key: 'level', label: 'Level', type: 'number', required: true, min: 0, max: 20, hint: 'Higher is more senior.' },
    ],
    sort: (a, b) => a.level - b.level || a.name.localeCompare(b.name),
    row: d => ({ title: d.name, sub: `Level ${d.level} · ${people(d.employeeCount)}` }),
    init: d => ({ name: d?.name ?? '', level: d?.level ?? 1 }),
    body: v => ({ name: v['name'].trim(), level: num(v['level']) }),
    blocked: d => d.employeeCount ? `${people(d.employeeCount)} ${d.employeeCount === 1 ? 'has' : 'have'} this title. Give them another title first.` : null,
  },
  locations: {
    path: 'locations', title: 'Locations', singular: 'location',
    intro: 'Offices, client sites or Remote. Each has its own time zone; holiday calendars will hang on locations.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Pune HQ' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'timezone', label: 'Time zone', type: 'select', required: true, options: () => TIMEZONES },
      { key: 'isActive', label: 'In use (shown when adding people)', type: 'checkbox', editOnly: true },
    ],
    sort: (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name),
    row: l => ({ title: l.name, sub: [[l.city, l.country].filter(Boolean).join(', '), l.timezone, people(l.employeeCount)].filter(Boolean).join(' · '), badge: l.isActive ? undefined : 'Inactive', muted: !l.isActive }),
    init: l => ({ name: l?.name ?? '', city: l?.city ?? '', state: l?.state ?? '', country: l?.country ?? 'India', timezone: l?.timezone ?? 'Asia/Kolkata', isActive: l?.isActive ?? true }),
    body: v => ({ name: v['name'].trim(), city: v['city'].trim() || null, state: v['state'].trim() || null, country: v['country'].trim(), timezone: v['timezone'], isActive: !!v['isActive'] }),
    blocked: l => l.employeeCount ? `${people(l.employeeCount)} work${l.employeeCount === 1 ? 's' : ''} at ${l.name}. Move them first, or mark it not in use.` : null,
  },
  grades: {
    path: 'grades', title: 'Grades', singular: 'grade',
    intro: 'Bands such as L1 to L8. Separate from the job title, so two titles can share a band.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. L4' },
      { key: 'level', label: 'Level', type: 'number', required: true, min: 1, max: 50, hint: 'Orders the grades. Higher is more senior.' },
      { key: 'description', label: 'Description', type: 'text', placeholder: 'e.g. Lead' },
    ],
    sort: (a, b) => a.level - b.level || a.name.localeCompare(b.name),
    row: g => ({ title: g.description ? `${g.name} · ${g.description}` : g.name, sub: `Level ${g.level} · ${people(g.employeeCount)}` }),
    init: g => ({ name: g?.name ?? '', level: g?.level ?? 1, description: g?.description ?? '' }),
    body: v => ({ name: v['name'].trim(), level: num(v['level']), description: v['description'].trim() || null }),
    blocked: g => g.employeeCount ? `${people(g.employeeCount)} ${g.employeeCount === 1 ? 'is' : 'are'} on ${g.name}. Change their grade first.` : null,
  },
  'employment-types': {
    path: 'employment-types', title: 'Employment types', singular: 'employment type',
    intro: 'New people get the default type. Each type sets its own probation and notice period.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Fixed-term contract' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'probationMonths', label: 'Probation (months)', type: 'number', required: true, min: 0, max: 24 },
      { key: 'noticePeriodDays', label: 'Notice period (days)', type: 'number', required: true, min: 0, max: 365 },
      { key: 'isDefault', label: 'Default for new people', type: 'checkbox',
        locked: t => t?.isDefault ? 'To change the default, open another type and make it the default.' : null },
    ],
    sort: (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name),
    row: t => ({ title: t.name, sub: `${t.probationMonths ? t.probationMonths + ' months probation' : 'No probation'} · ${t.noticePeriodDays} days notice · ${people(t.employeeCount)}`, badge: t.isDefault ? 'Default' : undefined }),
    init: t => ({ name: t?.name ?? '', description: t?.description ?? '', probationMonths: t?.probationMonths ?? 0, noticePeriodDays: t?.noticePeriodDays ?? 30, isDefault: t?.isDefault ?? false }),
    body: v => ({ name: v['name'].trim(), description: v['description'].trim() || null, probationMonths: num(v['probationMonths']), noticePeriodDays: num(v['noticePeriodDays']), isDefault: !!v['isDefault'] }),
    blocked: t => t.isDefault ? `${t.name} is the default. Make another type the default first.`
      : t.employeeCount ? `${people(t.employeeCount)} ${t.employeeCount === 1 ? 'is' : 'are'} on ${t.name}. Move them to another type first.` : null,
  },
  'exit-reasons': {
    path: 'exit-reasons', title: 'Exit reasons', singular: 'reason',
    intro: 'Why people leave. HR picks one when starting an exit; it feeds attrition reports later.',
    fields: [{ key: 'name', label: 'Reason', type: 'text', required: true, placeholder: 'e.g. Better opportunity' }],
    sort: (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    row: r => ({ title: r.name, sub: r.usageCount === 0 ? 'Not used yet' : r.usageCount === 1 ? 'Given for 1 exit' : `Given for ${r.usageCount} exits` }),
    init: r => ({ name: r?.name ?? '' }),
    body: (v, r) => ({ name: v['name'].trim(), sortOrder: r?.sortOrder ?? null }),
    blocked: () => null,
    deleteNote: r => r.usageCount ? `Past exits keep "${r.name}" as their reason; it just won't be offered for new ones.` : 'No one has used it. You can add it again later.',
    reorder: true,
  },
  'offboarding-items': {
    path: 'offboarding-items', title: 'Offboarding checklist', singular: 'checklist item',
    intro: 'Every new exit gets these steps, in this order. Changes here don\u2019t affect exits already started.',
    fields: [
      { key: 'name', label: 'What needs doing', type: 'text', required: true, placeholder: 'e.g. Return access card' },
      { key: 'owner', label: 'Who looks after it', type: 'select', required: true, options: () => OWNERS },
      { key: 'isActive', label: 'Add to new exits', type: 'checkbox', editOnly: true, hint: 'Switch off to keep it but stop adding it.' },
    ],
    sort: (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    row: t => ({ title: t.name, sub: t.owner, badge: t.isActive ? undefined : 'Off', muted: !t.isActive }),
    init: t => ({ name: t?.name ?? '', owner: t?.owner ?? 'HR', isActive: t?.isActive ?? true }),
    body: (v, t) => ({ name: v['name'].trim(), owner: v['owner'], isActive: !!v['isActive'], sortOrder: t?.sortOrder ?? null }),
    blocked: () => null,
    deleteNote: () => 'Exits already started keep their own copy of this step.',
    reorder: true,
  },
};
