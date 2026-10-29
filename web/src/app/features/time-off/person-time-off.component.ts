import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideX } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { EmployeeTimeOff, LeaveRequest } from './time-off.models';
import { STATUS_STYLE, days, fmt, num, range, statusText } from './time-off-format';
import { errorText } from '../people/people-errors';
import { ToastService } from '../../core/services/toast.service';
import { BalanceCardComponent } from './balance-card.component';

/**
 * Time off on a profile: balances and recent requests. Shown to the person, their reporting line and HR;
 * anyone else gets a 403 and the section stays hidden. HR can adjust a balance and apply on their behalf.
 */
@Component({
  selector: 'ws-person-time-off',
  standalone: true,
  imports: [RouterLink, BalanceCardComponent, LucideX],
  template: `
    @if (data(); as d) {
      <section class="p-4 bg-white border border-slate-200 rounded-14 flex flex-col gap-3" aria-labelledby="pto-h">
        <div class="flex items-center gap-2">
          <h2 id="pto-h" class="m-0 flex-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Time off · {{ d.yearLabel }}</h2>
          @if (d.canAdjust) {
            <a [routerLink]="['/time-off/apply']" [queryParams]="{ for: employeeId() }" class="text-[13px] font-semibold">Add time off</a>
            <button type="button" (click)="openAdjust()" class="h-9 px-2 bg-transparent border-0 text-[13px] font-semibold text-indigo-700 cursor-pointer">Adjust</button>
          }
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
          @for (b of d.balances; track b.leaveTypeId) { <ws-balance-card [b]="b" /> }
        </div>
        @if (recent().length) {
          <ul class="list-none m-0 p-0 flex flex-col">
            @for (r of recent(); track r.id) {
              <li class="flex items-center gap-2 py-2 border-t border-slate-100 text-[13px]">
                <span class="w-2 h-2 rounded-full shrink-0" [style.background]="r.color" aria-hidden="true"></span>
                <span class="flex-1 min-w-0 truncate">{{ rng(r) }} · {{ r.leaveTypeName }} · {{ d_(r.days) }}</span>
                <span class="px-2 py-0.5 rounded-full border text-[11px] font-semibold" [class]="pill(r)">{{ status(r) }}</span>
              </li>
            }
          </ul>
        }
        @if (d.adjustments.length) {
          <details class="text-[13px]">
            <summary class="cursor-pointer font-semibold text-slate-700">Balance changes by HR ({{ d.adjustments.length }})</summary>
            <ul class="list-none m-0 mt-2 p-0 flex flex-col gap-1.5">
              @for (a of d.adjustments; track a.id) {
                <li class="text-slate-700"><b>{{ a.days > 0 ? '+' : '' }}{{ n(a.days) }}</b> {{ a.leaveTypeName }} · {{ a.note }} <span class="text-slate-500">– {{ a.byName }}, {{ f(a.at) }}</span></li>
              }
            </ul>
          </details>
        }
      </section>
    }

    @if (adjusting()) {
      <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="adjusting.set(false)">
        <section role="dialog" aria-modal="true" aria-label="Adjust balance" (click)="$event.stopPropagation()"
                 class="w-full lg:max-w-[460px] bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
          <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
          <div class="flex items-center gap-2">
            <h2 class="m-0 flex-1 text-[19px] font-bold">Adjust {{ data()?.name }}’s balance</h2>
            <button type="button" (click)="adjusting.set(false)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
          </div>
          @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }
          <label class="ws-field">Type
            <select class="ws-input" [value]="adjType()" (change)="adjType.set($any($event.target).value)">
              @for (b of limited(); track b.leaveTypeId) { <option [value]="b.leaveTypeId" [selected]="b.leaveTypeId === adjType()">{{ b.name }} ({{ n(b.available) }} left)</option> }
            </select>
          </label>
          <div class="grid grid-cols-2 p-1 rounded-12 bg-slate-100" role="group" aria-label="Add or remove">
            <button type="button" (click)="adjSign.set(1)" [attr.aria-pressed]="adjSign() === 1" class="h-10 rounded-[9px] border-0 text-[14px] font-semibold cursor-pointer" [class]="adjSign() === 1 ? 'bg-white shadow-sm' : 'bg-transparent text-slate-600'">Add days</button>
            <button type="button" (click)="adjSign.set(-1)" [attr.aria-pressed]="adjSign() === -1" class="h-10 rounded-[9px] border-0 text-[14px] font-semibold cursor-pointer" [class]="adjSign() === -1 ? 'bg-white shadow-sm' : 'bg-transparent text-slate-600'">Remove days</button>
          </div>
          <label class="ws-field">Days <input class="ws-input" type="number" min="0.5" step="0.5" [value]="adjDays()" (input)="adjDays.set($any($event.target).value)" /></label>
          <label class="ws-field">Why <span class="hint">Kept with the balance history.</span>
            <input class="ws-input" maxlength="500" [value]="adjNote()" (input)="adjNote.set($any($event.target).value)" placeholder="e.g. Worked two Saturdays during the launch" />
          </label>
          <button type="button" (click)="saveAdjust()" [disabled]="saving() || !adjNote().trim() || !(+adjDays() > 0)" class="ws-btn ws-btn-primary">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </section>
      </div>
    }
  `,
})
export class PersonTimeOffComponent {
  private readonly svc = inject(TimeOffService);
  private readonly toast = inject(ToastService);
  readonly employeeId = input.required<string>();
  readonly data = signal<EmployeeTimeOff | null>(null);
  readonly recent = signal<LeaveRequest[]>([]);
  readonly adjusting = signal(false);
  readonly adjType = signal(''); readonly adjSign = signal<1 | -1>(1); readonly adjDays = signal<string | number>(1); readonly adjNote = signal('');
  readonly saving = signal(false); readonly sheetError = signal<string | null>(null);

  constructor() {
    effect(() => { const id = this.employeeId(); untracked(() => void this.load(id)); });
  }

  private async load(id: string) {
    try { this.set(await firstValueFrom(this.svc.employee(id))); }
    catch (e) { if (!(e instanceof HttpErrorResponse && (e.status === 403 || e.status === 404))) this.data.set(null); }
  }
  private set(d: EmployeeTimeOff) { this.data.set(d); this.recent.set(d.requests.filter(r => r.status !== 'Cancelled').slice(0, 5)); }

  limited() { return (this.data()?.balances ?? []).filter(b => !b.unlimited); }
  openAdjust() {
    const first = this.limited()[0]; if (!first) return;
    this.adjType.set(first.leaveTypeId); this.adjSign.set(1); this.adjDays.set(1); this.adjNote.set(''); this.sheetError.set(null);
    this.adjusting.set(true);
  }
  async saveAdjust() {
    const d = this.data(); if (!d) return;
    this.saving.set(true); this.sheetError.set(null);
    try {
      this.set(await firstValueFrom(this.svc.adjust(d.employeeId, { leaveTypeId: this.adjType(), year: d.year, days: this.adjSign() * Number(this.adjDays()), note: this.adjNote().trim() })));
      this.adjusting.set(false); this.toast.show('Balance updated');
    } catch (e) { this.sheetError.set(errorText(e, 'Could not adjust the balance.')); }
    finally { this.saving.set(false); }
  }

  rng(r: LeaveRequest) { return range(r); }
  d_(x: number) { return days(x); }
  n(x: number | null) { return num(x); }
  f(iso: string) { return fmt(iso.slice(0, 10)); }
  pill(r: LeaveRequest) { return STATUS_STYLE[r.status]; }
  status(r: LeaveRequest) { return statusText(r); }
}
