import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideX } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { Employee, EmploymentType, ExitReason } from '../../../core/models/people.models';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';
import { addDays, daysBetween, fmtDay, todayIst } from '../exit/exit-dates';

/** An employee resigns: proposed last day (notice period pre-filled), reason, a message to their manager. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideX],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full flex flex-col">
      <header class="sticky top-0 z-30 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/profile" aria-label="Close without sending" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideX [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 text-[18px] font-bold">Resign</h1>
      </header>
      @if (loading()) { <p class="p-4 text-[14px] text-slate-600">Loading…</p> }
      @else if (loadError()) { <div class="m-4 ws-alert" role="alert">{{ loadError() }}</div> }
      @else {
        <form class="flex-1 p-4 flex flex-col gap-4" (submit)="$event.preventDefault(); submit()" novalidate>
          <p class="m-0 text-[14px] leading-relaxed text-slate-700">Your resignation goes to {{ manager() || 'HR' }}{{ manager() ? ' and HR' : '' }}. Nothing changes until they accept it, and you can withdraw it until then.</p>
          @if (error()) { <div class="ws-alert" role="alert" id="resign-error">{{ error() }}</div> }

          <section class="ws-card">
            <label class="ws-field">Proposed last working day
              <input class="ws-input" type="date" [min]="today" [value]="lastDay()" (input)="lastDay.set($any($event.target).value); error.set(null)" [attr.aria-invalid]="tried() && !!dayErr()">
              @if (tried() && dayErr()) { <span class="err">{{ dayErr() }}</span> }
            </label>
            @if (notice()) {
              <p class="m-0 text-[13px] leading-relaxed" [class.text-amber-800]="short() > 0" [class.text-slate-600]="short() <= 0">
                Your notice period is {{ notice() }} days{{ typeName() ? ' (' + typeName() + ')' : '' }}, which ends on {{ day(full()) }}.
                @if (short() > 0) { Leaving {{ short() }} {{ short() === 1 ? 'day' : 'days' }} earlier needs your manager’s agreement. }
              </p>
            }
          </section>

          <section class="ws-card">
            <label class="ws-field"><span>Reason <span class="font-normal text-slate-600">· optional</span></span>
              <select class="ws-input" (change)="reasonId.set($any($event.target).value || null)">
                <option value="">Prefer not to say</option>
                @for (r of reasons(); track r.id) { <option [value]="r.id" [selected]="r.id === reasonId()">{{ r.name }}</option> }
              </select>
            </label>
            <label class="ws-field"><span>Message to {{ manager() || 'HR' }} <span class="font-normal text-slate-600">· optional</span></span>
              <textarea class="ws-input" rows="4" maxlength="1000" [value]="note()" (input)="note.set($any($event.target).value)" placeholder="Anything you’d like them to know"></textarea>
            </label>
          </section>

          <div class="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-200 mt-auto">
            <button type="submit" class="ws-btn w-full btn-danger" [disabled]="saving()">{{ saving() ? 'Sending…' : 'Send resignation' }}</button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`.btn-danger { background:#b91c1c; color:#fff; } .btn-danger:hover { background:#991b1b; }`],
})
export class ResignPage {
  private readonly people = inject(PeopleService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly today = todayIst();
  readonly loading = signal(true); readonly loadError = signal<string | null>(null);
  readonly saving = signal(false); readonly error = signal<string | null>(null); readonly tried = signal(false);
  readonly me = signal<Employee | null>(null);
  readonly reasons = signal<ExitReason[]>([]);
  readonly notice = signal(0); readonly typeName = signal<string | null>(null);
  readonly lastDay = signal(''); readonly reasonId = signal<string | null>(null); readonly note = signal('');

  readonly manager = computed(() => this.me()?.managerName ?? null);
  readonly full = computed(() => addDays(this.today, this.notice()));
  readonly short = computed(() => this.lastDay() ? Math.max(0, this.notice() - daysBetween(this.today, this.lastDay())) : 0);
  readonly dayErr = computed(() => !this.lastDay() ? 'Choose a date.' : this.lastDay() < this.today ? 'Can’t be in the past.'
    : daysBetween(this.today, this.lastDay()) > 366 ? 'Must be within a year.' : null);

  constructor() { void this.load(); }
  day(d: string) { return fmtDay(d); }

  private async load() {
    try {
      const [me, reasons, types] = await Promise.all([
        firstValueFrom(this.people.me()),
        firstValueFrom(this.people.exitReasons().pipe(catchError(() => of([] as ExitReason[])))),
        firstValueFrom(this.people.employmentTypes().pipe(catchError(() => of([] as EmploymentType[])))),
      ]);
      this.me.set(me); this.reasons.set(reasons);
      const t = types.find(x => x.id === me.employmentTypeId);
      this.notice.set(t?.noticePeriodDays ?? 0); this.typeName.set(t?.name ?? null);
      this.lastDay.set(addDays(this.today, this.notice()));
    } catch (e) { this.loadError.set(errorText(e, 'Could not open the resignation form.')); }
    finally { this.loading.set(false); }
  }

  async submit() {
    this.tried.set(true);
    if (this.dayErr()) return;
    this.saving.set(true); this.error.set(null);
    try {
      await firstValueFrom(this.people.resign({ lastWorkingDay: this.lastDay() + 'T00:00:00Z', reasonId: this.reasonId(), note: this.note().trim() || null }));
      this.toast.show(`Resignation sent to ${this.manager() ?? 'HR'}.`);
      await this.router.navigate(['/more/profile'], { replaceUrl: true });
    } catch (e) {
      this.error.set(errorText(e, 'Could not send your resignation. Please try again.'));
      document.getElementById('resign-error')?.scrollIntoView({ block: 'center' });
    } finally { this.saving.set(false); }
  }
}
