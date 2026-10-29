import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft } from '@lucide/angular';
import { TimeOffService } from '../time-off.service';
import { LeaveSettings } from '../time-off.models';
import { fmt, monthName } from '../time-off-format';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';

/** Settings › Work week and leave year. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Work week and leave year</h1>
      </header>
      @if (s(); as cur) {
        <div class="p-4 flex flex-col gap-5">
          <fieldset class="ws-card">
            <legend class="sr-only">Weekend</legend>
            <h2 class="ws-card-h">Weekend</h2>
            <p class="m-0 text-[13px] text-slate-600">Weekend days aren’t counted as leave.</p>
            <div class="flex flex-wrap gap-2">
              @for (d of week; track d.v) { <button type="button" class="ws-pill" [attr.aria-pressed]="weekend().includes(d.v)" (click)="toggle(d.v)">{{ d.label }}</button> }
            </div>
          </fieldset>
          <section class="ws-card">
            <h2 class="ws-card-h">Leave year</h2>
            <label class="ws-field">Starts in
              <select class="ws-input" [value]="start()" (change)="start.set(+$any($event.target).value)">
                @for (m of months; track m) { <option [value]="m" [selected]="m === start()">{{ mn(m - 1) }}</option> }
              </select>
              <span class="hint">Now: {{ cur.yearLabel }}, {{ f(cur.yearStart) }} to {{ f(cur.yearEnd) }}. Balances reset and carry forward on this date. It can’t change once people have applied.</span>
            </label>
          </section>
          @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
          <button type="button" class="ws-btn ws-btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </div>
      } @else if (error()) { <div class="m-4 ws-alert" role="alert">{{ error() }}</div> }
    </div>
  `,
})
export class TimeOffSettingsPage {
  private readonly svc = inject(TimeOffService);
  private readonly toast = inject(ToastService);
  readonly week = [{ v: 1, label: 'Mon' }, { v: 2, label: 'Tue' }, { v: 3, label: 'Wed' }, { v: 4, label: 'Thu' }, { v: 5, label: 'Fri' }, { v: 6, label: 'Sat' }, { v: 0, label: 'Sun' }];
  readonly months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  readonly s = signal<LeaveSettings | null>(null);
  readonly weekend = signal<number[]>([]); readonly start = signal(1);
  readonly saving = signal(false); readonly error = signal<string | null>(null);
  constructor() {
    firstValueFrom(this.svc.settings()).then(x => this.set(x)).catch(e => this.error.set(errorText(e, 'Could not load the settings.')));
  }
  private set(x: LeaveSettings) { this.s.set(x); this.weekend.set(x.weekendDays); this.start.set(x.yearStartMonth); }
  toggle(v: number) { this.weekend.update(w => w.includes(v) ? w.filter(x => x !== v) : [...w, v]); }
  async save() {
    this.saving.set(true); this.error.set(null);
    try { this.set(await firstValueFrom(this.svc.saveSettings({ weekendDays: this.weekend(), yearStartMonth: this.start() }))); this.toast.show('Saved'); }
    catch (e) { this.error.set(errorText(e, 'Could not save.')); }
    finally { this.saving.set(false); }
  }
  mn(i: number) { return monthName(i); }
  f(d: string) { return fmt(d, true); }
}
