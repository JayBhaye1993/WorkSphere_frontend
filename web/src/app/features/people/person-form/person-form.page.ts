import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideX } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { CustomField, Department, Designation, Employee, EmploymentType, Grade, Location } from '../../../core/models/people.models';
import { CustomFieldInputComponent, hasValue } from '../../../shared/custom-field-input.component';
import { PersonPickerComponent, PickedPerson } from './person-picker.component';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';

const PHONE = /^\+?[0-9 ()-]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const today = () => new Date().toISOString().slice(0, 10);

interface Form {
  fullName: string; email: string; joiningDate: string; phone: string;
  departmentId: string; designationId: string; locationId: string; gradeId: string; employmentTypeId: string;
  manager: PickedPerson | null; invite: boolean;
}

/**
 * Add person (employees.create) and Edit person (employees.edit) share this form.
 * Every list comes from the company's own settings; required company fields appear automatically.
 */
@Component({
  standalone: true,
  imports: [RouterLink, CustomFieldInputComponent, PersonPickerComponent, LucideX],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full flex flex-col">
      <header class="sticky top-0 z-30 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a [routerLink]="cancelLink()" aria-label="Close without saving" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900">
          <svg lucideX [size]="22" aria-hidden="true"></svg>
        </a>
        <h1 class="m-0 flex-1 text-[18px] font-bold truncate">{{ isEdit() ? 'Edit ' + (person()?.fullName ?? '') : 'Add person' }}</h1>
        @if (codeLabel()) { <span class="mr-3 text-[13px] text-slate-600">Code <span class="mono text-slate-900">{{ codeLabel() }}</span></span> }
      </header>

      @if (loading()) {
        <p class="p-4 text-[14px] text-slate-600">Loading…</p>
      } @else if (loadError()) {
        <div class="m-4 ws-alert" role="alert">{{ loadError() }}</div>
      } @else {
        <form class="flex-1 p-4 flex flex-col gap-4" (submit)="$event.preventDefault(); submit()" novalidate>
          @if (saveError()) { <div class="ws-alert" role="alert" id="form-error">{{ saveError() }}</div> }

          @if (!isEdit()) {
            <section class="flex flex-col gap-3">
              <label class="ws-field">Full name <span class="sr-only">(required)</span>
                <input class="ws-input" autocomplete="off" [value]="f().fullName" (input)="set('fullName', $any($event.target).value)" [attr.aria-invalid]="show() && !!err().fullName">
                @if (show() && err().fullName) { <span class="err">{{ err().fullName }}</span> }
              </label>
              <label class="ws-field">Work email
                <input class="ws-input" type="email" autocomplete="off" inputmode="email" [value]="f().email" (input)="set('email', $any($event.target).value)" [attr.aria-invalid]="show() && !!err().email">
                @if (show() && err().email) { <span class="err">{{ err().email }}</span> }
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label class="ws-field">Joins on
                  <input class="ws-input" type="date" [value]="f().joiningDate" (input)="set('joiningDate', $any($event.target).value)" [attr.aria-invalid]="show() && !!err().joiningDate">
                  @if (show() && err().joiningDate) { <span class="err">{{ err().joiningDate }}</span> }
                </label>
                <label class="ws-field"><span>Mobile <span class="font-normal text-slate-600">· optional</span></span>
                  <input class="ws-input" type="tel" inputmode="tel" [value]="f().phone" (input)="set('phone', $any($event.target).value)" [attr.aria-invalid]="show() && !!err().phone">
                  @if (show() && err().phone) { <span class="err">{{ err().phone }}</span> }
                </label>
              </div>
            </section>
          } @else {
            <section class="ws-card">
              <p class="m-0 text-[14px] text-slate-600">{{ person()?.email }} · joined {{ joinedLabel() }}</p>
              <label class="ws-field">Mobile
                <input class="ws-input" type="tel" inputmode="tel" [value]="f().phone" (input)="set('phone', $any($event.target).value)" [attr.aria-invalid]="show() && !!err().phone">
                @if (show() && err().phone) { <span class="err">{{ err().phone }}</span> }
              </label>
            </section>
          }

          <section class="ws-card">
            <h2 class="ws-card-h">Role and team</h2>
            <label class="ws-field">Team
              <select class="ws-input" (change)="set('departmentId', $any($event.target).value)">
                <option value="" [selected]="!f().departmentId" [disabled]="isEdit() && !!person()?.departmentId">Not set</option>
                @for (d of deptOptions(); track d.id) { <option [value]="d.id" [selected]="d.id === f().departmentId">{{ d.label }}</option> }
              </select>
            </label>
            <label class="ws-field">Title
              <select class="ws-input" (change)="set('designationId', $any($event.target).value)">
                <option value="" [selected]="!f().designationId" [disabled]="isEdit() && !!person()?.designationId">Not set</option>
                @for (d of designations(); track d.id) { <option [value]="d.id" [selected]="d.id === f().designationId">{{ d.name }}</option> }
              </select>
            </label>
            <ws-person-picker label="Reports to" [excludeId]="person()?.id ?? null" [value]="f().manager" (valueChange)="setManager($event)"
                              [hint]="isEdit() ? null : 'Leave empty for someone at the top of the company.'" />
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">Location
                <select class="ws-input" (change)="set('locationId', $any($event.target).value)">
                  <option value="" [selected]="!f().locationId" [disabled]="isEdit() && !!person()?.locationId">Not set</option>
                  @for (l of locations(); track l.id) { <option [value]="l.id" [selected]="l.id === f().locationId">{{ l.name }}</option> }
                </select>
              </label>
              <label class="ws-field">Grade
                <select class="ws-input" (change)="set('gradeId', $any($event.target).value)">
                  <option value="" [selected]="!f().gradeId" [disabled]="isEdit() && !!person()?.gradeId">Not set</option>
                  @for (g of grades(); track g.id) { <option [value]="g.id" [selected]="g.id === f().gradeId">{{ g.name }}{{ g.description ? ' · ' + g.description : '' }}</option> }
                </select>
              </label>
            </div>
            <label class="ws-field">Employment type
              <select class="ws-input" (change)="set('employmentTypeId', $any($event.target).value)">
                @for (t of types(); track t.id) { <option [value]="t.id" [selected]="t.id === f().employmentTypeId">{{ t.name }}</option> }
              </select>
              @if (typeTerms()) { <span class="hint">{{ typeTerms() }}</span> }
            </label>
          </section>

          @if (formFields().length) {
            <section class="ws-card">
              <h2 class="ws-card-h">Company fields</h2>
              @for (cf of formFields(); track cf.key) {
                <ws-custom-field-input [field]="cf" [value]="custom()[cf.key] ?? null" (valueChange)="setCustom(cf.key, $event)"
                                       [error]="show() ? (err().custom[cf.key] || null) : null" />
              }
            </section>
          }

          @if (!isEdit()) {
            <label class="flex items-center gap-3 p-4 rounded-12 bg-indigo-50 cursor-pointer">
              <span class="flex-1 flex flex-col gap-0.5">
                <span class="text-[15px] font-semibold text-indigo-700">Send a login invite</span>
                <span class="text-[13px] text-slate-700">{{ firstName() || 'They' }} set{{ firstName() ? 's' : '' }} a password from the email and starts with the Employee role.</span>
              </span>
              <input type="checkbox" class="w-6 h-6 accent-indigo-600" [checked]="f().invite" (change)="setInvite($any($event.target).checked)">
            </label>
          }

          <div class="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-200 mt-auto">
            <button type="submit" class="ws-btn ws-btn-primary w-full" [disabled]="saving() || (isEdit() && !dirty())">{{ submitLabel() }}</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class PersonFormPage implements OnInit {
  /** Present when editing (route /people/:id/edit). */
  readonly id = input<string | undefined>(undefined);

  private readonly people = inject(PeopleService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly isEdit = computed(() => !!this.id());

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly show = signal(false);           // show field errors after the first submit

  readonly person = signal<Employee | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly designations = signal<Designation[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly grades = signal<Grade[]>([]);
  readonly types = signal<EmploymentType[]>([]);
  readonly fields = signal<CustomField[]>([]);
  readonly nextCode = signal<string | null>(null);

  readonly f = signal<Form>({ fullName: '', email: '', joiningDate: today(), phone: '', departmentId: '', designationId: '',
    locationId: '', gradeId: '', employmentTypeId: '', manager: null, invite: true });
  readonly custom = signal<Record<string, unknown>>({});
  private original = '';

  readonly formFields = computed(() => this.fields().filter(x => x.isActive));
  readonly firstName = computed(() => this.f().fullName.trim().split(/\s+/)[0] ?? '');
  readonly codeLabel = computed(() => this.isEdit() ? this.person()?.employeeCode ?? null : this.nextCode());
  readonly cancelLink = computed(() => this.isEdit() ? ['/people', this.id()!] : ['/people']);
  readonly joinedLabel = computed(() => this.person() ? new Date(this.person()!.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  readonly dirty = computed(() => this.snapshot() !== this.original);

  /** Departments as "Engineering › Platform", sorted by that path. */
  readonly deptOptions = computed(() => {
    const byId = new Map(this.departments().map(d => [d.id, d]));
    const path = (d: Department): string => {
      const parts = [d.name]; const seen = new Set([d.id]);
      for (let p = d.parentDepartmentId; p && byId.has(p) && !seen.has(p); p = byId.get(p)!.parentDepartmentId) { seen.add(p); parts.unshift(byId.get(p)!.name); }
      return parts.join(' › ');
    };
    return this.departments().map(d => ({ id: d.id, label: path(d) })).sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly typeTerms = computed(() => {
    const t = this.types().find(x => x.id === this.f().employmentTypeId);
    if (!t) return null;
    const prob = t.probationMonths ? `${t.probationMonths} months probation` : 'No probation';
    return `${prob} · ${t.noticePeriodDays} days notice`;
  });

  readonly err = computed(() => {
    const v = this.f(); const e: { fullName?: string; email?: string; joiningDate?: string; phone?: string; custom: Record<string, string> } = { custom: {} };
    if (!this.isEdit()) {
      if (!v.fullName.trim()) e.fullName = 'Enter their full name.';
      if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid work email.';
      const max = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
      if (!v.joiningDate) e.joiningDate = 'Choose the joining date.';
      else if (v.joiningDate > max) e.joiningDate = 'Can be at most 90 days ahead.';
    }
    if (v.phone.trim() && !PHONE.test(v.phone.trim())) e.phone = 'Enter a valid phone number.';
    for (const cf of this.formFields()) if (cf.isRequired && !hasValue(this.custom()[cf.key])) e.custom[cf.key] = `${cf.name} is required.`;
    return e;
  });
  readonly hasErrors = computed(() => { const e = this.err(); return !!(e.fullName || e.email || e.joiningDate || e.phone || Object.keys(e.custom).length); });

  readonly submitLabel = computed(() => {
    if (this.saving()) return 'Saving…';
    if (this.isEdit()) return this.dirty() ? 'Save changes' : 'No changes';
    const who = this.firstName() || 'person';
    return this.f().invite ? `Add ${who} and send invite` : `Add ${who}`;
  });

  ngOnInit() { void this.load(); }   // route inputs are bound by now

  set<K extends keyof Form>(k: K, v: Form[K]) { this.f.update(x => ({ ...x, [k]: v })); this.saveError.set(null); }
  setManager(p: PickedPerson | null) { this.set('manager', p); }
  setInvite(v: boolean) { this.set('invite', v); }
  setCustom(k: string, v: unknown) { this.custom.update(x => ({ ...x, [k]: v })); this.saveError.set(null); }

  private snapshot() { return JSON.stringify([this.f(), this.custom()]); }

  private async load() {
    const opt = <T>(o: import('rxjs').Observable<T>, fallback: T) => firstValueFrom(o.pipe(catchError(() => of(fallback))));
    try {
      const [depts, desigs, locs, grades, types, fields, settings, person] = await Promise.all([
        opt(this.people.departments(), [] as Department[]), opt(this.people.designations(), [] as Designation[]),
        opt(this.people.locations(), [] as Location[]), opt(this.people.grades(), [] as Grade[]),
        opt(this.people.employmentTypes(), [] as EmploymentType[]), opt(this.people.customFields(), [] as CustomField[]),
        this.isEdit() ? Promise.resolve(null) : opt(this.people.employeeSettings(), null),
        this.isEdit() ? firstValueFrom(this.people.employee(this.id()!)) : Promise.resolve(null),
      ]);
      this.departments.set(depts); this.designations.set([...desigs].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)));
      this.locations.set(locs.filter(l => l.isActive || l.id === person?.locationId)); this.grades.set(grades);
      this.types.set(types); this.fields.set(fields); this.nextCode.set(settings?.nextCodePreview ?? null);
      if (person) {
        this.person.set(person);
        this.f.set({ fullName: person.fullName, email: person.email, joiningDate: person.joiningDate.slice(0, 10), phone: person.phone ?? '',
          departmentId: person.departmentId ?? '', designationId: person.designationId ?? '', locationId: person.locationId ?? '',
          gradeId: person.gradeId ?? '', employmentTypeId: person.employmentTypeId ?? '', invite: false,
          manager: person.managerId ? { id: person.managerId, fullName: person.managerName ?? 'Current manager', designationName: null } : null });
        this.custom.set({ ...(person.customFields ?? {}) });
        // Show the manager's title in the picker too.
        if (person.managerId) {
          const m = await firstValueFrom(this.people.card(person.managerId).pipe(catchError(() => of(null))));
          if (m) this.f.update(x => ({ ...x, manager: { id: m.id, fullName: m.fullName, designationName: m.designationName } }));
        }
      } else {
        this.set('employmentTypeId', types.find(t => t.isDefault)?.id ?? types[0]?.id ?? '');
      }
      this.original = this.snapshot();
    } catch (e) {
      this.loadError.set(errorText(e, this.isEdit() ? 'You cannot edit this person.' : 'Could not load the form.'));
    } finally { this.loading.set(false); }
  }

  async submit() {
    this.show.set(true);
    if (this.hasErrors()) { this.saveError.set('Please fix the highlighted fields.'); return; }
    const v = this.f(); const id = (x: string) => x || null;
    this.saving.set(true); this.saveError.set(null);
    try {
      if (this.isEdit()) {
        const p = this.person()!;
        const before = (JSON.parse(this.original)[1] ?? {}) as Record<string, unknown>;
        const changed = Object.fromEntries(this.formFields()
          .filter(x => JSON.stringify(this.custom()[x.key] ?? null) !== JSON.stringify(before[x.key] ?? null))
          .map(x => [x.key, this.custom()[x.key] ?? null]));
        await firstValueFrom(this.people.update(p.id, {
          phone: v.phone.trim(), departmentId: id(v.departmentId), designationId: id(v.designationId),
          locationId: id(v.locationId), gradeId: id(v.gradeId), employmentTypeId: id(v.employmentTypeId),
          managerId: v.manager?.id ?? null, clearManager: !v.manager && !!p.managerId,
          customFields: Object.keys(changed).length ? changed : undefined,
        }));
        this.toast.show(`${p.fullName.split(' ')[0]}'s details are saved.`);
        await this.router.navigate(['/people', p.id], { replaceUrl: true });
      } else {
        const custom = Object.fromEntries(Object.entries(this.custom()).filter(([, x]) => hasValue(x)));
        const created = await firstValueFrom(this.people.create({
          fullName: v.fullName.trim(), email: v.email.trim(), joiningDate: v.joiningDate + 'T00:00:00Z', phone: v.phone.trim() || null,
          departmentId: id(v.departmentId), designationId: id(v.designationId), managerId: v.manager?.id ?? null,
          locationId: id(v.locationId), gradeId: id(v.gradeId), employmentTypeId: id(v.employmentTypeId),
          customFields: Object.keys(custom).length ? custom : undefined, inviteToLogin: v.invite,
        }));
        this.toast.show(v.invite ? `${created.fullName} added. Invite sent to ${created.email}.` : `${created.fullName} added.`);
        await this.router.navigate(['/people', created.id], { replaceUrl: true });
      }
    } catch (e) {
      this.saveError.set(errorText(e, 'Could not save. Please try again.'));
      document.getElementById('form-error')?.scrollIntoView({ block: 'center' });
    } finally { this.saving.set(false); }
  }
}
