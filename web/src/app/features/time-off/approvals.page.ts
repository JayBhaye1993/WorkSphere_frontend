import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideX } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { LeaveRequest } from './time-off.models';
import { days, range } from './time-off-format';
import { errorText } from '../people/people-errors';
import { AvatarComponent } from '../../shared/avatar.component';
import { ToastService } from '../../core/services/toast.service';

/** Time off waiting for the viewer: their reporting line (managers) or everyone (HR). */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, LucideArrowLeft, LucideX],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/time-off" aria-label="Back to time off" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Approvals</h1>
      </header>
      <div class="p-4 flex flex-col gap-3">
        @if (loading()) { <p class="m-0 text-[14px] text-slate-600">Loading…</p> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (!items().length) { <div class="p-6 rounded-14 bg-white border border-slate-200 text-center text-[14px] text-slate-600">Nothing is waiting for you.</div> }
        @else {
          @for (r of items(); track r.id) {
            <article class="p-4 rounded-14 bg-white border border-slate-200 flex flex-col gap-3" [style.border-left]="'4px solid ' + r.color">
              <div class="flex items-start gap-3">
                <a [routerLink]="['/people', r.employeeId]" class="shrink-0"><ws-avatar [name]="r.employeeName" [size]="40" /></a>
                <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <a [routerLink]="['/people', r.employeeId]" class="text-[15px] font-semibold text-slate-900 no-underline">{{ r.employeeName }}</a>
                  <span class="text-[14px] text-slate-800">{{ rng(r) }}</span>
                  <span class="text-[13px] text-slate-600">{{ r.leaveTypeName }} · {{ d(r.days) }}@if (r.sandwichDays) { (incl. {{ r.sandwichDays }} weekend/holiday) }@if (r.appliedByName) { · added by {{ r.appliedByName }}}</span>
                  @if (r.stage === 2) { <span class="text-[12px] font-semibold text-indigo-700">{{ r.firstApproverName }} approved · your decision is final</span> }
                  @if (r.reason) { <span class="text-[13px] text-slate-700">“{{ r.reason }}”</span> }
                  @if (r.needsDocument) { <span class="text-[12px] text-amber-800">A supporting document is needed for this length.</span> }
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" (click)="declining.set(r); reason.set(''); sheetError.set(null)" [disabled]="busy() === r.id" class="ws-btn ws-btn-ghost !h-11">Decline</button>
                <button type="button" (click)="approve(r)" [disabled]="busy() === r.id" class="ws-btn ws-btn-primary !h-11">{{ busy() === r.id ? 'Saving…' : 'Approve' }}</button>
              </div>
            </article>
          }
        }
      </div>

      @if (declining(); as r) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="declining.set(null)">
          <section role="dialog" aria-modal="true" aria-label="Decline request" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[460px] bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <h2 class="m-0 flex-1 text-[19px] font-bold">Decline {{ r.employeeName }}’s request</h2>
              <button type="button" (click)="declining.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            <p class="m-0 text-[14px] text-slate-700">{{ r.leaveTypeName }}, {{ rng(r) }}</p>
            @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }
            <label class="ws-field">Reason <span class="hint">They’ll see this, so they know what to change.</span>
              <textarea class="ws-input" rows="3" maxlength="1000" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="e.g. Release week. Could you move it to the week after?"></textarea>
            </label>
            <button type="button" (click)="decline(r)" [disabled]="busy() === r.id || !reason().trim()" class="ws-btn bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300">{{ busy() === r.id ? 'Declining…' : 'Decline' }}</button>
          </section>
        </div>
      }
    </div>
  `,
})
export class ApprovalsPage {
  private readonly svc = inject(TimeOffService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly items = signal<LeaveRequest[]>([]);
  readonly busy = signal<string | null>(null);
  readonly declining = signal<LeaveRequest | null>(null);
  readonly reason = signal(''); readonly sheetError = signal<string | null>(null);

  constructor() {
    firstValueFrom(this.svc.approvals()).then(x => this.items.set(x))
      .catch(e => this.error.set(errorText(e, 'Could not load approvals.'))).finally(() => this.loading.set(false));
  }

  async approve(r: LeaveRequest) {
    this.busy.set(r.id);
    try { await firstValueFrom(this.svc.approve(r.id)); this.drop(r); this.toast.show(`Approved for ${r.employeeName}`); }
    catch (e) { this.toast.show(errorText(e, 'Could not approve.'), 'error'); }
    finally { this.busy.set(null); }
  }

  async decline(r: LeaveRequest) {
    this.busy.set(r.id); this.sheetError.set(null);
    try { await firstValueFrom(this.svc.reject(r.id, this.reason().trim())); this.drop(r); this.declining.set(null); this.toast.show('Declined'); }
    catch (e) { this.sheetError.set(errorText(e, 'Could not decline.')); }
    finally { this.busy.set(null); }
  }

  private drop(r: LeaveRequest) { this.items.update(x => x.filter(i => i.id !== r.id)); }
  rng(r: LeaveRequest) { return range(r); }
  d(n: number) { return days(n); }
}
