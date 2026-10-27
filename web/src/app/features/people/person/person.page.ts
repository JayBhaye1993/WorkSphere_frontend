import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideArrowLeft, LucideLock, LucideMail, LucidePhone } from '@lucide/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { PeopleService } from '../people.service';
import { CustomField, DirectoryEntry, Employee, ExitCase, JobRecord } from '../../../core/models/people.models';
import { AvatarComponent } from '../../../shared/avatar.component';
import { errorText } from '../people-errors';
import { CareerTimelineComponent } from '../career-timeline.component';
import { ExitCardComponent } from '../exit/exit-card.component';
import { fmtDay } from '../exit/exit-dates';

interface Row { label: string; value?: string; chips?: string[]; mono?: boolean; }

@Component({
  selector: 'ws-person',
  standalone: true,
  imports: [RouterLink, AvatarComponent, CareerTimelineComponent, ExitCardComponent, LucideArrowLeft, LucidePhone, LucideMail, LucideLock],
  template: `
    <div class="mx-auto max-w-[760px] pb-10">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white flex items-center">
        <button type="button" (click)="back()" aria-label="Back to people"
                class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer">
          <svg lucideArrowLeft [size]="22" aria-hidden="true"></svg>
        </button>
        @if (canEdit && full() && card()?.status !== 'Exited') {
          <a [routerLink]="['/people', id(), 'edit']" class="ml-auto mr-2 h-10 px-4 rounded-10 border border-slate-300 bg-white text-[14px] font-semibold text-slate-900 flex items-center hover:bg-slate-50">Edit</a>
        }
      </header>

      @if (loading()) {
        <div class="px-5 py-6 bg-white flex flex-col items-center gap-3" aria-label="Loading profile">
          <span class="w-[72px] h-[72px] rounded-full bg-slate-100 animate-pulse"></span>
          <span class="h-5 w-48 rounded bg-slate-100 animate-pulse"></span>
          <span class="h-4 w-64 rounded bg-slate-100 animate-pulse"></span>
        </div>
      } @else if (error()) {
        <div role="alert" class="m-4 p-4 rounded-14 bg-red-50 border border-red-100 flex flex-col gap-3">
          <p class="m-0 text-[15px] text-red-600 font-medium">{{ error() }}</p>
          <a routerLink="/people" class="self-start h-10 px-4 rounded-10 bg-white border border-slate-300 text-[14px] font-semibold flex items-center">Back to people</a>
        </div>
      } @else { @if (card(); as c) {
        <section class="bg-white px-5 pb-5 flex flex-col items-center gap-1.5 border-b border-slate-200 text-center">
          <ws-avatar [name]="c.fullName" [photo]="c.profilePhotoUrl" [size]="72" />
          <h1 class="mt-2 mb-0 text-[22px] font-bold">{{ c.fullName }}</h1>
          @if (titleLine()) { <p class="m-0 text-[14px] text-slate-700">{{ titleLine() }}</p> }
          <p class="m-0 text-[13px] text-slate-600"><span class="mono">{{ c.employeeCode }}</span>@if (c.locationName) { · {{ c.locationName }} }</p>
          <div class="mt-3 w-full grid gap-2" [class.grid-cols-2]="!!c.phone" [class.grid-cols-1]="!c.phone">
            @if (c.phone) {
              <a [href]="'tel:' + c.phone" class="action"><svg lucidePhone [size]="18" aria-hidden="true"></svg>Call</a>
            }
            <a [href]="'mailto:' + c.email" class="action"><svg lucideMail [size]="18" aria-hidden="true"></svg>Email</a>
          </div>
          @if (c.leavingOn) {
            <p class="mt-2 mb-0 w-full px-3 py-2 rounded-10 text-[14px] font-semibold" [class.banner-leaving]="c.status !== 'Exited'" [class.banner-left]="c.status === 'Exited'" role="status">
              {{ c.status === 'Exited' ? 'Left on ' + day(c.leavingOn) : 'Leaving on ' + day(c.leavingOn) }}</p>
          }
        </section>

        <div class="flex flex-col gap-3 px-4 pt-3">
          @if (exit(); as x) {
            @if (x.status !== 'Withdrawn') { <ws-exit-card [exit]="x" [name]="firstName()" (changed)="exitChanged($event)" /> }
          }
          @if (chain().length) {
            <section class="card">
              <h2 class="card-h">Reports to</h2>
              <ol class="list-none m-0 p-0 flex flex-col gap-1">
                @for (m of chain(); track m.id; let first = $first) {
                  <li>
                    <a [routerLink]="['/people', m.id]" class="flex items-center gap-2.5 min-h-[44px] text-slate-900 no-underline">
                      <ws-avatar [name]="m.fullName" [size]="first ? 32 : 26" />
                      <span class="text-[14px]" [class.font-semibold]="first">{{ m.fullName }}</span>
                      @if (m.designationName) { <span class="text-[13px] text-slate-600 truncate">{{ m.designationName }}</span> }
                    </a>
                  </li>
                }
              </ol>
            </section>
          }

          @if (work().length) {
            <section class="card">
              <h2 class="card-h">Work</h2>
              <dl class="facts">
                @for (r of work(); track r.label) {
                  <dt>{{ r.label }}</dt>
                  <dd>
                    @if (r.chips) { <span class="flex flex-wrap gap-1.5">@for (x of r.chips; track x) {<span class="tag">{{ x }}</span>}</span> }
                    @else { <span [class.mono]="r.mono">{{ r.value }}</span> }
                  </dd>
                }
              </dl>
            </section>
          }

          @if (steps().length) {
            <section class="card" aria-labelledby="career-h">
              <div class="flex items-center justify-between">
                <h2 id="career-h" class="card-h">Career</h2>
                <a [routerLink]="['/people', id(), 'history']" class="text-[14px] font-semibold min-h-[44px] flex items-center -my-3">Full history</a>
              </div>
              <ws-career-timeline [steps]="steps()" [limit]="3" />
              @if (steps().length > 3) { <p class="m-0 text-[13px] text-slate-600">{{ steps().length - 3 }} earlier {{ steps().length - 3 === 1 ? 'step' : 'steps' }} in full history.</p> }
            </section>
          }

          @if (personal().length) {
            <section class="card">
              <h2 class="card-h flex items-center gap-1.5"><svg lucideLock [size]="14" aria-hidden="true"></svg>Personal</h2>
              <dl class="facts">
                @for (r of personal(); track r.label) {
                  <dt>{{ r.label }}</dt>
                  <dd>@if (r.chips) { <span class="flex flex-wrap gap-1.5">@for (x of r.chips; track x) {<span class="tag">{{ x }}</span>}</span> } @else { {{ r.value }} }</dd>
                }
              </dl>
              <p class="m-0 text-[12px] text-slate-600">Private. Seen only by HR and {{ firstName() }}.</p>
            </section>
          }

          @if (canStartExit()) {
            <a [routerLink]="['/people', id(), 'exit']" class="self-center mt-2 min-h-[44px] px-4 flex items-center text-[14px] font-semibold text-red-700 no-underline rounded-10 hover:bg-red-50">Start exit</a>
          }

          @if (!full()) {
            <p class="m-0 px-1 text-[13px] text-slate-600 leading-relaxed">You can see {{ firstName() }}’s contact details. The full profile is visible to their managers and HR.</p>
          }
        </div>
      } }
    </div>
  `,
  styles: [`
    .action { height:56px; border-radius:12px; background:#eef2ff; color:#3730a3; font-size:13px; font-weight:600;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; text-decoration:none; }
    .action:hover { background:#e0e7ff; }
    .action:focus-visible { outline:2px solid #4f46e5; outline-offset:2px; }
    .card { padding:14px 16px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; display:flex; flex-direction:column; gap:10px; }
    .card-h { margin:0; font-size:13px; font-weight:600; color:#475569; text-transform:uppercase; letter-spacing:.06em; }
    .facts { margin:0; display:grid; grid-template-columns:120px 1fr; row-gap:10px; column-gap:8px; font-size:14px; }
    .facts dt { color:#475569; } .facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }
    .banner-leaving { background:#fef3c7; color:#92400e; } .banner-left { background:#f1f5f9; color:#334155; }
    .tag { padding:2px 8px; border-radius:999px; background:#f1f5f9; font-size:12px; font-weight:600; color:#334155; }
  `],
})
export class PersonPage {
  /** Route parameter (bound by the router). */
  readonly id = input.required<string>();

  private readonly people = inject(PeopleService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly canEdit = this.auth.can('employees.edit');
  readonly canExit = this.auth.can('employees.exit');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly card = signal<DirectoryEntry | null>(null);
  readonly full = signal<Employee | null>(null);
  readonly fields = signal<CustomField[]>([]);
  readonly chain = signal<DirectoryEntry[]>([]);
  readonly steps = signal<JobRecord[]>([]);
  readonly exit = signal<ExitCase | null>(null);
  /** HR, someone still here, no exit in progress, and not their own profile. */
  readonly canStartExit = computed(() => this.canExit && !!this.full() && this.card()?.status !== 'Exited'
    && (!this.exit() || this.exit()!.status === 'Withdrawn') && this.card()?.email !== this.auth.user()?.email);

  readonly firstName = computed(() => this.card()?.fullName.split(' ')[0] ?? '');
  readonly titleLine = computed(() => [this.card()?.designationName, this.card()?.departmentName].filter(Boolean).join(' · '));

  readonly work = computed<Row[]>(() => {
    const e = this.full();
    if (!e) return [];
    const rows: Row[] = [];
    if (e.departmentName) rows.push({ label: 'Department', value: e.departmentName });
    if (e.gradeName) rows.push({ label: 'Grade', value: e.gradeName });
    if (e.employmentType) rows.push({ label: 'Type', value: e.employmentType });
    rows.push({ label: 'Joined', value: `${fmtDate(e.joiningDate)} · ${tenure(e.joiningDate)}` });
    rows.push(...this.customRows(e, false));
    return rows;
  });

  readonly personal = computed<Row[]>(() => {
    const e = this.full();
    if (!e) return [];
    const rows: Row[] = [];
    if (e.dateOfBirth) rows.push({ label: 'Date of birth', value: fmtDate(e.dateOfBirth) });
    if (e.gender) rows.push({ label: 'Gender', value: e.gender });
    if (e.address) rows.push({ label: 'Address', value: e.address });
    if (e.emergencyContact) rows.push({ label: 'Emergency', value: [e.emergencyContact, e.emergencyPhone].filter(Boolean).join(' · ') });
    rows.push(...this.customRows(e, true));
    return rows;
  });

  constructor() {
    // Reload when the route moves to another person (tapping a manager in "Reports to").
    effect(() => { const id = this.id(); void this.load(id); }, { allowSignalWrites: true });
  }

  day(iso: string) { return fmtDay(iso); }

  /** A tick only updates the card; completing or withdrawing changes the profile, so reload it. */
  exitChanged(x: ExitCase) {
    const was = this.exit()?.status;
    this.exit.set(x);
    if (x.status !== was) void this.load(this.id());
  }

  back() {
    if (history.length > 1) this.location.back(); else void this.router.navigate(['/people']);
  }

  private async load(id: string) {
    this.loading.set(true); this.error.set(null); this.full.set(null); this.chain.set([]); this.steps.set([]); this.exit.set(null);
    try {
      const [card, full, fields] = await Promise.all([
        firstValueFrom(this.people.card(id)),
        firstValueFrom(this.people.employee(id).pipe(catchError(() => of(null)))),   // outside your scope: show the card only
        firstValueFrom(this.people.customFields().pipe(catchError(() => of([] as CustomField[])))),
      ]);
      this.card.set(card); this.full.set(full); this.fields.set(fields);
      this.loading.set(false);
      if (full) firstValueFrom(this.people.timeline(id)).then(s => { if (this.id() === id) this.steps.set(s); }).catch(() => {});
      if (full || this.canExit) firstValueFrom(this.people.exit(id)).then(x => { if (this.id() === id) this.exit.set(x); }).catch(() => {});
      // Reporting line, up to three levels.
      const chain: DirectoryEntry[] = [];
      let next = card.managerId;
      while (next && chain.length < 3 && next !== id) {
        const m = await firstValueFrom(this.people.card(next).pipe(catchError(() => of(null))));
        if (!m) break;
        chain.push(m); next = m.managerId;
        this.chain.set([...chain]);
      }
    } catch (e) {
      this.error.set(errorText(e, 'Could not open this profile.'));
      this.loading.set(false);
    }
  }

  private customRows(e: Employee, sensitive: boolean): Row[] {
    const values = e.customFields ?? {};
    return this.fields()
      .filter(f => f.isSensitive === sensitive && values[f.key] !== undefined && values[f.key] !== null && values[f.key] !== '')
      .map(f => {
        const v = values[f.key];
        if (f.fieldType === 'MultiSelect' && Array.isArray(v)) return { label: f.name, chips: v.map(String) };
        if (f.fieldType === 'Boolean') return { label: f.name, value: v ? 'Yes' : 'No' };
        if (f.fieldType === 'Date') return { label: f.name, value: fmtDate(String(v)) };
        return { label: f.name, value: String(v), mono: /tag|code|id$/i.test(f.name) };
      });
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tenure(iso: string) {
  const from = new Date(iso), now = new Date();
  let months = (now.getFullYear() - from.getFullYear()) * 12 + now.getMonth() - from.getMonth();
  if (now.getDate() < from.getDate()) months--;
  if (months < 1) return 'less than a month';
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ');
}
