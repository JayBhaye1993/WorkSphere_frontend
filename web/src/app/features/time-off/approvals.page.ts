import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideX } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { CompOffClaim, LeaveRequest } from './time-off.models';
import { days, range } from './time-off-format';
import { errorText } from '../people/people-errors';
import { AvatarComponent } from '../../shared/avatar.component';
import { ToastService } from '../../core/services/toast.service';

type Item = { kind: 'leave'; r: LeaveRequest } | { kind: 'comp'; c: CompOffClaim };

/** Time off and comp-off claims waiting for the viewer, with select-and-approve for several at once. */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, LucideArrowLeft, LucideX],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full pb-28">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/time-off" aria-label="Back to time off" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Approvals</h1>
        @if (total() > 1) {
          <button type="button" (click)="toggleAll()" class="mr-2 h-9 px-3 rounded-full bg-transparent border-0 text-[14px] font-semibold text-indigo-700 cursor-pointer hover:bg-indigo-50">{{ selected().size === total() ? 'Clear' : 'Select all' }}</button>
        }
      </header>
      <div class="p-4 flex flex-col gap-5">
        @if (loading()) { <p class="m-0 text-[14px] text-slate-600">Loading…</p> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (!total()) { <div class="p-6 rounded-14 bg-white border border-slate-200 text-center text-[14px] text-slate-600">Nothing is waiting for you.</div> }
        @else {
          @if (items().length) {
            <section class="flex flex-col gap-3">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Time off · {{ items().length }}</h2>
              @for (r of items(); track r.id) {
                <article class="p-4 rounded-14 bg-white border flex flex-col gap-3" [class]="selected().has(r.id) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'" [style.border-left]="'4px solid ' + r.color">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" class="mt-2.5 w-5 h-5 accent-indigo-600 shrink-0" [checked]="selected().has(r.id)" (change)="toggle(r.id)" [attr.aria-label]="'Select ' + r.employeeName" />
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
                    <button type="button" (click)="openDecline({ kind: 'leave', r })" [disabled]="busy()" class="ws-btn ws-btn-ghost !h-11">Decline</button>
                    <button type="button" (click)="approveOne(r.id)" [disabled]="busy()" class="ws-btn ws-btn-primary !h-11">Approve</button>
                  </div>
                </article>
              }
            </section>
          }
          @if (claims().length) {
            <section class="flex flex-col gap-3">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Comp-off claims · {{ claims().length }}</h2>
              @for (c of claims(); track c.id) {
                <article class="p-4 rounded-14 bg-white border flex flex-col gap-3 !border-l-4 !border-l-amber-500" [class]="selected().has(c.id) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" class="mt-2.5 w-5 h-5 accent-indigo-600 shrink-0" [checked]="selected().has(c.id)" (change)="toggle(c.id)" [attr.aria-label]="'Select ' + c.employeeName" />
                    <ws-avatar [name]="c.employeeName" [size]="40" />
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span class="text-[15px] font-semibold">{{ c.employeeName }}</span>
                      <span class="text-[14px] text-slate-800">Worked {{ c.workedLabel }} · {{ c.days === 1 ? 'full day' : 'half day' }}</span>
                      <span class="text-[13px] text-slate-700">“{{ c.reason }}”</span>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" (click)="openDecline({ kind: 'comp', c })" [disabled]="busy()" class="ws-btn ws-btn-ghost !h-11">Decline</button>
                    <button type="button" (click)="approveOne(c.id)" [disabled]="busy()" class="ws-btn ws-btn-primary !h-11">Approve</button>
                  </div>
                </article>
              }
            </section>
          }
        }
      </div>

      @if (selected().size > 0) {
        <div class="fixed z-20 left-0 right-0 bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-4 px-4 py-3 lg:px-0 bg-white/95 lg:bg-transparent border-t border-slate-200 lg:border-0 flex justify-center">
          <button type="button" (click)="approveSelected()" [disabled]="busy()" class="ws-btn ws-btn-primary w-full lg:w-auto lg:shadow-lg">{{ busy() ? 'Approving…' : 'Approve ' + selected().size + ' selected' }}</button>
        </div>
      }

      @if (declining(); as it) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="declining.set(null)">
          <section role="dialog" aria-modal="true" aria-label="Decline" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[460px] bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <h2 class="m-0 flex-1 text-[19px] font-bold">Decline {{ who(it) }}’s {{ it.kind === 'leave' ? 'request' : 'claim' }}</h2>
              <button type="button" (click)="declining.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            <p class="m-0 text-[14px] text-slate-700">{{ summary(it) }}</p>
            @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }
            <label class="ws-field">Reason <span class="hint">They’ll see this.</span>
              <textarea class="ws-input" rows="3" maxlength="1000" [value]="reason()" (input)="reason.set($any($event.target).value)"></textarea>
            </label>
            <button type="button" (click)="decline(it)" [disabled]="busy() || !reason().trim()" class="ws-btn bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300">{{ busy() ? 'Declining…' : 'Decline' }}</button>
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
  readonly claims = signal<CompOffClaim[]>([]);
  readonly selected = signal(new Set<string>());
  readonly busy = signal(false);
  readonly declining = signal<Item | null>(null);
  readonly reason = signal(''); readonly sheetError = signal<string | null>(null);
  readonly total = computed(() => this.items().length + this.claims().length);

  constructor() { void this.load(); }

  async load() {
    try {
      const [a, b] = await Promise.all([firstValueFrom(this.svc.approvals()), firstValueFrom(this.svc.compOffApprovals())]);
      this.items.set(a); this.claims.set(b);
    } catch (e) { this.error.set(errorText(e, 'Could not load approvals.')); }
    finally { this.loading.set(false); }
  }

  toggle(id: string) { this.selected.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  toggleAll() {
    const all = [...this.items().map(r => r.id), ...this.claims().map(c => c.id)];
    this.selected.set(this.selected().size === all.length ? new Set() : new Set(all));
  }

  private async approveIds(ids: string[]): Promise<{ ok: number; failed: string[] }> {
    let ok = 0; const failed: string[] = [];
    for (const id of ids) {
      const isClaim = this.claims().some(c => c.id === id);
      try { if (isClaim) await firstValueFrom(this.svc.approveCompOff(id)); else await firstValueFrom(this.svc.approve(id)); ok++; this.drop(id); }
      catch (e) { failed.push(errorText(e, 'Could not approve.')); }
    }
    return { ok, failed };
  }

  async approveOne(id: string) {
    this.busy.set(true);
    const { ok, failed } = await this.approveIds([id]);
    this.busy.set(false);
    if (ok) this.toast.show('Approved'); else this.toast.show(failed[0], 'error');
  }

  async approveSelected() {
    this.busy.set(true);
    const { ok, failed } = await this.approveIds([...this.selected()]);
    this.busy.set(false);
    if (failed.length) this.toast.show(`${ok} approved, ${failed.length} not: ${failed[0]}`, 'error');
    else this.toast.show(`${ok} approved`);
  }

  openDecline(it: Item) { this.declining.set(it); this.reason.set(''); this.sheetError.set(null); }
  async decline(it: Item) {
    this.busy.set(true); this.sheetError.set(null);
    try {
      if (it.kind === 'leave') { await firstValueFrom(this.svc.reject(it.r.id, this.reason().trim())); this.drop(it.r.id); }
      else { await firstValueFrom(this.svc.rejectCompOff(it.c.id, this.reason().trim())); this.drop(it.c.id); }
      this.declining.set(null); this.toast.show('Declined');
    } catch (e) { this.sheetError.set(errorText(e, 'Could not decline.')); }
    finally { this.busy.set(false); }
  }

  private drop(id: string) {
    this.items.update(x => x.filter(i => i.id !== id));
    this.claims.update(x => x.filter(i => i.id !== id));
    this.selected.update(s => { const n = new Set(s); n.delete(id); return n; });
  }
  who(it: Item) { return it.kind === 'leave' ? it.r.employeeName : it.c.employeeName; }
  summary(it: Item) { return it.kind === 'leave' ? `${it.r.leaveTypeName}, ${range(it.r)}` : `Comp-off for ${it.c.workedLabel}`; }
  rng(r: LeaveRequest) { return range(r); }
  d(n: number) { return days(n); }
}
