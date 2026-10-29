import { SkeletonComponent } from '../../../shared/skeleton.component';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideInfo, LucideLock, LucideX } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { EXIT_TYPES, Employee, EmploymentType, ExitCase, ExitReason } from '../../../core/models/people.models';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';
import { addDays, daysBetween, fmtDay, todayIst } from './exit-dates';

/**
 * Start an exit (HR, employees.exit), or change one: while serving notice everything can change;
 * after they have left only the reason, private note and rehire decision.
 */
@Component({
  standalone: true,
  imports: [SkeletonComponent, RouterLink, LucideX, LucideInfo, LucideLock],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full flex flex-col">
      <header class="sticky top-0 z-30 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a [routerLink]="['/people', id()]" aria-label="Close without saving" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900">
          <svg lucideX [size]="22" aria-hidden="true"></svg>
        </a>
        <div class="min-w-0 flex flex-col">
          <h1 class="m-0 text-[18px] font-bold leading-tight">{{ existing() ? (left() ? 'Exit details' : 'Change exit') : 'Start exit' }}</h1>
          @if (person()) { <span class="text-[13px] text-slate-600 truncate">{{ person()!.fullName }}</span> }
        </div>
      </header>

      @if (loading()) { <ws-skeleton class="block p-4" kind="form" [rows]="4" /> }
      @else if (loadError()) { <div class="m-4 ws-alert" role="alert">{{ loadError() }}</div> }
      @else {
        <form class="flex-1 p-4 flex flex-col gap-4" (submit)="$event.preventDefault(); submit()" novalidate>
          @if (saveError()) { <div class="ws-alert" role="alert" id="exit-error">{{ saveError() }}</div> }

          @if (!left()) {
            <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
              <legend class="p-0 mb-2 text-[13px] font-semibold">How are they leaving?</legend>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                @for (t of types; track t) {
                  <button type="button" (click)="exitType.set(t)" [attr.aria-pressed]="exitType() === t" class="kind" [class.kind-on]="exitType() === t">{{ t }}</button>
                }
              </div>
            </fieldset>

            <section class="ws-card">
              <div class="grid grid-cols-2 gap-3">
                <label class="ws-field">{{ exitType() === 'Resignation' ? 'Resigned on' : 'Notice given on' }}
                  <input class="ws-input" type="date" [min]="joined()" [max]="today" [value]="noticeDate()" (input)="setNotice($any($event.target).value)" [attr.aria-invalid]="show() && !!noticeErr()">
                  @if (show() && noticeErr()) { <span class="err">{{ noticeErr() }}</span> }
                </label>
                <label class="ws-field">Last working day
                  <input class="ws-input" type="date" [min]="noticeDate()" [value]="lastDay()" (input)="setLastDay($any($event.target).value)" [attr.aria-invalid]="show() && !!lastErr()">
                  @if (show() && lastErr()) { <span class="err">{{ lastErr() }}</span> }
                </label>
              </div>
              @if (noticeLine(); as n) {
                <p class="m-0 text-[13px] leading-relaxed" [class.text-amber-800]="shortBy() > 0" [class.text-slate-600]="shortBy() <= 0">{{ n }}</p>
              }
              @if (lastDay() && lastDay() < today) {
                <p class="m-0 p-3 rounded-10 bg-amber-50 text-[13px] text-amber-900 flex gap-2"><svg lucideInfo [size]="16" class="shrink-0 mt-px" aria-hidden="true"></svg>
                  The last working day has passed, so {{ first() }} leaves as soon as you save.</p>
              }
            </section>
          } @else {
            <section class="ws-card">
              <p class="m-0 text-[14px] text-slate-700">{{ existing()!.exitType }} · left on {{ day(existing()!.lastWorkingDay) }}</p>
              <p class="m-0 text-[13px] text-slate-600">The dates are part of their history now. You can still record the reason, notes and whether you'd rehire them.</p>
            </section>
          }

          <section class="ws-card">
            <label class="ws-field">Reason
              <select class="ws-input" (change)="reasonId.set($any($event.target).value || null)">
                <option value="" [selected]="!reasonId()">Not recorded</option>
                @for (r of reasons(); track r.id) { <option [value]="r.id" [selected]="r.id === reasonId()">{{ r.name }}</option> }
                @if (oldReason(); as o) { <option [value]="o.id" [selected]="true">{{ o.name }} (no longer on the list)</option> }
              </select>
            </label>
            <label class="ws-field"><span class="flex items-center gap-1.5"><svg lucideLock [size]="13" aria-hidden="true"></svg>Private note <span class="font-normal text-slate-600">· HR only</span></span>
              <textarea class="ws-input" rows="3" maxlength="2000" [value]="note()" (input)="note.set($any($event.target).value)" placeholder="Context, exit interview notes…"></textarea>
            </label>
            @if (existing()) {
              <fieldset class="m-0 p-0 border-0">
                <legend class="p-0 mb-2 text-[13px] font-semibold">Would you rehire {{ first() }}?</legend>
                <div class="grid grid-cols-3 p-1 rounded-12 bg-slate-100" role="group">
                  @for (o of rehireOptions; track o.label) {
                    <button type="button" (click)="rehire.set(o.value)" [attr.aria-pressed]="rehire() === o.value" class="seg" [class.seg-on]="rehire() === o.value">{{ o.label }}</button>
                  }
                </div>
              </fieldset>
            }
          </section>

          @if (!existing()) {
            <p class="m-0 px-1 text-[13px] leading-relaxed text-slate-600">{{ first() }} stays active and can sign in until the last working day. Then their login is switched off and their open tasks are unassigned. You'll get the offboarding checklist straight away.</p>
          }

          <div class="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-200 mt-auto">
            <button type="submit" class="ws-btn w-full" [class.ws-btn-primary]="!!existing()" [class.btn-danger]="!existing()" [disabled]="saving()">{{ label() }}</button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .kind { height:48px; border-radius:12px; font-size:14px; cursor:pointer; border:1px solid #cbd5e1; background:#fff; color:#334155; font-weight:500; }
    .kind-on { border:2px solid #4f46e5; background:#eef2ff; color:#312e81; font-weight:700; }
    .kind:focus-visible, .seg:focus-visible { outline:2px solid #4f46e5; outline-offset:2px; }
    .seg { height:38px; border-radius:10px; border:0; font-size:14px; cursor:pointer; background:transparent; color:#475569; font-weight:500; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,.08); }
    .btn-danger { background:#b91c1c; color:#fff; } .btn-danger:hover { background:#991b1b; }
  `],
})
export class ExitFormPage {
  readonly id = input.required<string>();
  private readonly people = inject(PeopleService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly types = EXIT_TYPES;
  readonly today = todayIst();
  readonly rehireOptions = [{ label: 'Yes', value: true }, { label: 'No', value: false }, { label: 'Not decided', value: null }] as const;

  readonly loading = signal(true); readonly loadError = signal<string | null>(null);
  readonly saving = signal(false); readonly saveError = signal<string | null>(null);
  readonly show = signal(false);
  readonly person = signal<Employee | null>(null);
  readonly reasons = signal<ExitReason[]>([]);
  readonly existing = signal<ExitCase | null>(null);
  readonly noticeDays = signal(0);
  readonly typeName = signal<string | null>(null);

  readonly exitType = signal<string>('Resignation');
  readonly noticeDate = signal(this.today);
  readonly lastDay = signal('');
  readonly reasonId = signal<string | null>(null);
  readonly note = signal('');
  readonly rehire = signal<boolean | null>(null);
  private lastDayTouched = false;

  readonly left = computed(() => this.existing()?.status === 'Completed');
  readonly first = computed(() => this.person()?.fullName.split(' ')[0] ?? 'They');
  readonly joined = computed(() => this.person()?.joiningDate.slice(0, 10) ?? '');
  /** A reason deleted from the list since it was chosen still shows. */
  readonly oldReason = computed(() => {
    const x = this.existing();
    return x?.reasonId && x.reasonId === this.reasonId() && !this.reasons().some(r => r.id === x.reasonId) ? { id: x.reasonId, name: x.reasonName ?? 'Reason' } : null;
  });
  readonly served = computed(() => this.noticeDate() && this.lastDay() ? daysBetween(this.noticeDate(), this.lastDay()) : 0);
  readonly shortBy = computed(() => Math.max(0, this.noticeDays() - this.served()));
  readonly noticeLine = computed(() => {
    if (!this.lastDay()) return null;
    const policy = this.noticeDays() ? `Notice period ${this.noticeDays()} days${this.typeName() ? ' (' + this.typeName() + ')' : ''}.` : 'No notice period set for their employment type.';
    if (!this.noticeDays()) return policy;
    if (this.shortBy() > 0) return `${policy} Serving ${this.served()} days: shortened by ${this.shortBy()}.`;
    return `${policy} Full notice served.`;
  });
  readonly noticeErr = computed(() => {
    const d = this.noticeDate();
    if (!d) return 'Choose a date.';
    if (d > this.today) return 'Can’t be in the future.';
    if (this.joined() && d < this.joined()) return `Can’t be before they joined (${fmtDay(this.joined())}).`;
    return null;
  });
  readonly lastErr = computed(() => {
    const d = this.lastDay();
    if (!d) return 'Choose the last working day.';
    if (d < this.noticeDate()) return 'Can’t be before the notice date.';
    if (daysBetween(this.noticeDate(), d) > 366) return 'Must be within a year of the notice date.';
    return null;
  });
  readonly label = computed(() => this.saving() ? 'Saving…' : this.existing() ? 'Save changes'
    : this.lastDay() && this.lastDay() < this.today ? `Record ${this.first()}’s exit` : `Start ${this.first()}’s exit`);

  constructor() { effect(() => { const id = this.id(); untracked(() => void this.load(id)); }); }

  setNotice(v: string) {
    this.noticeDate.set(v); this.saveError.set(null);
    if (!this.lastDayTouched && v) this.lastDay.set(addDays(v, this.noticeDays()));   // keep the notice period until HR picks a date
  }
  setLastDay(v: string) { this.lastDay.set(v); this.lastDayTouched = true; this.saveError.set(null); }
  day(iso: string) { return fmtDay(iso); }

  private async load(id: string) {
    this.loading.set(true); this.loadError.set(null);
    try {
      const [person, reasons, types, exit] = await Promise.all([
        firstValueFrom(this.people.employee(id)),
        firstValueFrom(this.people.exitReasons().pipe(catchError(() => of([] as ExitReason[])))),
        firstValueFrom(this.people.employmentTypes().pipe(catchError(() => of([] as EmploymentType[])))),
        firstValueFrom(this.people.exit(id).pipe(catchError(() => of(null)))),
      ]);
      this.person.set(person); this.reasons.set(reasons);
      const type = types.find(t => t.id === person.employmentTypeId);
      this.noticeDays.set(type?.noticePeriodDays ?? 0); this.typeName.set(type?.name ?? null);
      const open = exit && exit.status !== 'Withdrawn' ? exit : null;
      if (!open && person.status !== 'Active') { this.loadError.set(`${person.fullName} has already left.`); return; }
      this.existing.set(open);
      if (open) {
        this.exitType.set(open.exitType); this.noticeDate.set(open.noticeDate.slice(0, 10)); this.lastDay.set(open.lastWorkingDay.slice(0, 10));
        this.reasonId.set(open.reasonId); this.note.set(open.note ?? ''); this.rehire.set(open.rehireEligible);
        this.noticeDays.set(open.noticePeriodDays); this.lastDayTouched = true;
      } else {
        this.lastDay.set(addDays(this.today, this.noticeDays()));
      }
    } catch (e) { this.loadError.set(errorText(e, 'You cannot manage this person’s exit.')); }
    finally { this.loading.set(false); }
  }

  async submit() {
    this.show.set(true);
    if (!this.left() && (this.noticeErr() || this.lastErr())) { this.saveError.set('Please fix the highlighted dates.'); return; }
    this.saving.set(true); this.saveError.set(null);
    const body = { exitType: this.exitType(), noticeDate: this.noticeDate() + 'T00:00:00Z', lastWorkingDay: this.lastDay() + 'T00:00:00Z',
      reasonId: this.reasonId(), note: this.note().trim() || null, rehireEligible: this.rehire() };
    try {
      const x = this.existing()
        ? await firstValueFrom(this.people.updateExit(this.id(), body))
        : await firstValueFrom(this.people.startExit(this.id(), body));
      this.toast.show(x.status === 'Completed' && !this.existing() ? `${this.first()}’s exit is recorded. They have left.`
        : this.existing() ? 'Exit details saved.' : `Exit started. ${this.first()}’s last day is ${fmtDay(x.lastWorkingDay)}.`);
      await this.router.navigate(['/people', this.id()], { replaceUrl: true });
    } catch (e) {
      this.saveError.set(errorText(e, 'Could not save. Please try again.'));
      document.getElementById('exit-error')?.scrollIntoView({ block: 'center' });
    } finally { this.saving.set(false); }
  }
}
