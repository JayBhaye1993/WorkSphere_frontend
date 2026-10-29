import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideCalendarDays, LucideChevronRight, LucidePlus, LucideX, LucideInbox, LucidePalmtree, LucideUsers } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { LeaveCalendar, LeaveRequest, MyStats, MyTimeOff, TypeLedger, Half } from './time-off.models';
import { STATUS_STYLE, addDays, days, fmt, icsFile, num, parseDay, range, statusText, todayIso, weekday } from './time-off-format';
import { errorText } from '../people/people-errors';
import { AvatarComponent } from '../../shared/avatar.component';
import { ToastService } from '../../core/services/toast.service';
import { saveBlob } from '../../core/util/download';
import { BalanceCardComponent } from './balance-card.component';

/** The Time off tab: balances, what's waiting for you, your requests, who's off this week and holidays. */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, BalanceCardComponent, LucideCalendarDays, LucideChevronRight, LucidePlus, LucideX, LucideInbox, LucidePalmtree, LucideUsers],
  template: `
    <div class="mx-auto max-w-[960px] min-h-full pb-28 lg:pb-8">
      <header class="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 pt-5 pb-3 flex items-center gap-2">
        <h1 class="m-0 text-[26px] font-bold tracking-tight">Time off</h1>
        @if (data(); as d) { <span class="mono text-[14px] text-slate-600 mt-1">{{ d.yearLabel }}</span> }
        <span class="flex-1"></span>
        @if (data()?.canApprove || data()?.canManage) {
          <a routerLink="/time-off/team" aria-label="Team leave overview" title="Team leave overview" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800"><svg lucideUsers [size]="20" aria-hidden="true"></svg></a>
        }
        <a routerLink="/time-off/calendar" aria-label="Team calendar" title="Team calendar" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800"><svg lucideCalendarDays [size]="20" aria-hidden="true"></svg></a>
        <a routerLink="/time-off/apply" class="hidden lg:inline-flex ws-btn ws-btn-primary !h-11 items-center gap-1.5 no-underline"><svg lucidePlus [size]="18" aria-hidden="true"></svg>Apply</a>
      </header>

      @if (loading()) {
        <div class="p-4 flex flex-col gap-5" aria-busy="true" aria-label="Loading your time off">
          <div class="flex gap-3 overflow-hidden">@for (i of [1,2,3,4]; track i) { <div class="shrink-0 w-[168px] lg:flex-1 h-[118px] rounded-14 bg-slate-100 animate-pulse"></div> }</div>
          <div class="h-[132px] rounded-14 bg-slate-100 animate-pulse"></div>
          <div class="grid gap-5 lg:grid-cols-2"><div class="h-[120px] rounded-14 bg-slate-100 animate-pulse"></div><div class="h-[120px] rounded-14 bg-slate-100 animate-pulse"></div></div>
        </div>
      }
      @else if (error()) { <div class="m-4 ws-alert" role="alert">{{ error() }}</div> }
      @else if (data()) {
        @let d = data()!;
        <div class="p-4 flex flex-col gap-5">
          @if (d.pendingApprovals > 0) {
            <a routerLink="/time-off/approvals" class="flex items-center gap-3 p-3.5 rounded-14 bg-indigo-50 border border-indigo-200 text-indigo-950 no-underline hover:bg-indigo-100">
              <span class="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0"><svg lucideInbox [size]="19" aria-hidden="true"></svg></span>
              <span class="flex-1 text-[15px]"><b>{{ d.pendingApprovals }}</b> {{ d.pendingApprovals === 1 ? 'request is' : 'requests are' }} waiting for you</span>
              <svg lucideChevronRight [size]="18" aria-hidden="true"></svg>
            </a>
          }

          @if (!d.employeeId) {
            <div class="p-5 rounded-14 bg-white border border-slate-200 text-[14px] text-slate-700">Your login isn't linked to an employee profile yet, so there's no time off to show. Ask HR to check your profile.</div>
          } @else {
            <section class="flex flex-col gap-2" aria-labelledby="bal-h">
              <h2 id="bal-h" class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Your balance <span class="normal-case tracking-normal font-normal text-slate-500">· tap one to see how it works</span></h2>
              <div class="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible pb-1 [scrollbar-width:none]">
                @for (b of d.balances; track b.leaveTypeId) {
                  <button type="button" (click)="explain(b.leaveTypeId)" [attr.aria-label]="b.name + ': how it works'" class="snap-start shrink-0 w-[168px] lg:w-auto p-0 bg-transparent border-0 text-left cursor-pointer rounded-14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"><ws-balance-card [b]="b" /></button>
                }
                @empty { <p class="m-0 text-[14px] text-slate-600">No time off types apply to you yet.</p> }
              </div>
            </section>

            <section class="flex flex-col gap-2" aria-labelledby="req-h">
              <div class="flex items-center px-1"><h2 id="req-h" class="m-0 flex-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Your requests</h2>
                @if (d.compOffEnabled) { <a routerLink="/time-off/comp-off" class="text-[13px] font-semibold">Claim comp-off@if (pendingClaims() > 0) { ({{ pendingClaims() }} pending)}</a> }
              </div>
              @if (!d.requests.length) {
                <div class="p-5 rounded-14 bg-white border border-slate-200 text-center flex flex-col items-center gap-2">
                  <svg lucidePalmtree [size]="28" class="text-emerald-600" aria-hidden="true"></svg>
                  <p class="m-0 text-[14px] text-slate-700">No time off this year yet.</p>
                  <a routerLink="/time-off/apply" class="text-[14px] font-semibold">Plan a break</a>
                </div>
              } @else {
                @if (d.requests.length > 3) {
                  <div class="flex gap-2 overflow-x-auto [scrollbar-width:none] -mx-4 px-4" role="group" aria-label="Show">
                    @for (f of filters; track f.v) { <button type="button" class="ws-pill shrink-0" [attr.aria-pressed]="filter() === f.v" (click)="filter.set(f.v)">{{ f.label }}</button> }
                  </div>
                }
                <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                  @for (r of shown(); track r.id) {
                    <li class="flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
                      <span class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" [style.background]="r.color" aria-hidden="true"></span>
                      <span class="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span class="text-[15px] font-semibold">{{ rng(r) }}</span>
                        <span class="text-[13px] text-slate-600">{{ r.leaveTypeName }} · {{ days_(r.days) }}@if (r.sandwichDays) { (incl. {{ n(r.sandwichDays) }} weekend/holiday) }@if (r.appliedByName) { · added by {{ r.appliedByName }}}</span>
                        @if (r.editNote) { <span class="text-[12px] text-slate-500">{{ r.editNote }}</span> }
                        @if (r.waitingFor) { <span class="text-[12px] text-slate-500">Waiting for {{ r.waitingFor === 'HR' ? 'HR' : 'your manager' }}@if (r.firstApproverName) { · {{ r.firstApproverName }} approved }</span> }
                        @if (r.status === 'Rejected' && r.decisionNote) { <span class="text-[13px] text-rose-800">“{{ r.decisionNote }}” – {{ r.decidedByName }}</span> }
                        @else if (r.status === 'Approved' && r.decidedByName) { <span class="text-[12px] text-slate-500">Approved by {{ r.decidedByName }}</span> }
                        @if (r.attachmentName) { <button type="button" (click)="open(r)" class="self-start p-0 bg-transparent border-0 text-[12px] font-semibold text-indigo-700 cursor-pointer">📎 {{ r.attachmentName }}</button> }
                        @else if (r.needsDocument && r.canAttach) { <span class="text-[12px] text-amber-800">Needs a supporting document.</span> }
                        @if (r.canAttach) {
                          <label class="self-start text-[12px] font-semibold text-indigo-700 cursor-pointer">{{ r.attachmentName ? 'Replace document' : 'Add document' }}
                            <input type="file" class="sr-only" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" (change)="attach(r, $event)" />
                          </label>
                        }
                      </span>
                      <span class="flex flex-col items-end gap-1.5 shrink-0">
                        <span class="px-2 py-0.5 rounded-full border text-[12px] font-semibold" [class]="pill(r)">{{ status(r) }}</span>
                        @if (r.canCancel) { <button type="button" (click)="askCancel(r)" class="h-9 px-2 -mr-2 rounded-lg bg-transparent border-0 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">Cancel</button> }
                        @if (r.canCancel && r.days > 0.5) { <button type="button" (click)="askShorten(r)" class="h-9 px-2 -mr-2 rounded-lg bg-transparent border-0 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">Change dates</button> }
                        @if (r.status === 'Approved' && r.to >= today) { <button type="button" (click)="toCalendar(r)" class="h-9 px-2 -mr-2 rounded-lg bg-transparent border-0 text-[13px] font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer">Add to calendar</button> }
                      </span>
                    </li>
                  } @empty { <li class="px-4 py-4 text-[14px] text-slate-600">Nothing here.</li> }
                </ul>
                @if (d.requests.length > 6 && !all()) { <button type="button" (click)="all.set(true)" class="self-start px-1 bg-transparent border-0 text-[14px] font-semibold text-indigo-700 cursor-pointer">Show all {{ d.requests.length }}</button> }
              }
            </section>
          }

          @if (stats(); as st) {
            @if (st.totalDays > 0) {
              <section class="p-4 rounded-14 bg-white border border-slate-200 flex flex-col gap-3" aria-labelledby="yr-h">
                <div class="flex items-baseline gap-2"><h2 id="yr-h" class="m-0 flex-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Your year</h2><span class="text-[13px] text-slate-700"><b>{{ n(st.totalDays) }}</b> days taken</span></div>
                <div class="h-24 flex items-end gap-1" role="img" [attr.aria-label]="statsLabel()">
                  @for (m of st.months; track m.month) {
                    <div class="flex-1 h-full flex flex-col justify-end items-center gap-1">
                      <div class="w-full rounded-t-[3px] bg-indigo-500" [style.height.%]="statBar(m.days)" [class.!bg-slate-200]="m.days === 0" [style.min-height.px]="2"></div>
                      <span class="text-[10px] text-slate-500">{{ m.month.slice(0, 1) }}</span>
                    </div>
                  }
                </div>
                <div class="flex h-2.5 rounded-full overflow-hidden" aria-hidden="true">
                  @for (t of st.byType; track t.name) { <span [style.width.%]="t.days / st.totalDays * 100" [style.background]="t.color"></span> }
                </div>
                @if (st.byWeekday.length) {
                  <p class="m-0 text-[12px] text-slate-600">Days off by weekday:
                    @for (w of st.byWeekday; track w.month; let last = $last) { <span class="mono">{{ w.month }} {{ n(w.days) }}</span>@if (!last) { · } }
                  </p>
                }
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-700">
                  @for (t of st.byType; track t.name) { <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full" [style.background]="t.color" aria-hidden="true"></span>{{ t.name }} {{ n(t.days) }}</span> }
                </div>
              </section>
            }
          }

          <div class="grid gap-5 lg:grid-cols-2">
            <section class="flex flex-col gap-2" aria-labelledby="off-h">
              <div class="flex items-center px-1">
                <h2 id="off-h" class="m-0 flex-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Off this week</h2>
                <a routerLink="/time-off/calendar" class="text-[13px] font-semibold">Calendar</a>
              </div>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (o of offThisWeek(); track o.key) {
                  <li class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0">
                    <ws-avatar [name]="o.name" [size]="34" />
                    <span class="flex-1 min-w-0 flex flex-col">
                      <span class="text-[14px] font-semibold truncate">{{ o.name }}@if (o.isMe) { <span class="font-normal text-slate-500"> (you)</span> }</span>
                      <span class="text-[12px] text-slate-600">{{ o.when }}@if (o.pending) { · <span class="text-amber-700">pending</span> }</span>
                    </span>
                  </li>
                } @empty { <li class="px-4 py-4 text-[14px] text-slate-600">Everyone on your team is in this week.</li> }
              </ul>
            </section>

            <section class="flex flex-col gap-2" aria-labelledby="hol-h">
              <div class="flex items-center px-1">
                <h2 id="hol-h" class="m-0 flex-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Coming holidays</h2>
                <a routerLink="/time-off/holidays" class="text-[13px] font-semibold">All holidays</a>
              </div>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (h of upcomingHolidays(); track h.id) {
                  <li class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0">
                    <span class="w-11 shrink-0 flex flex-col items-center leading-none"><span class="text-[11px] uppercase text-slate-500">{{ mon(h.date) }}</span><span class="text-[19px] font-bold">{{ dayNo(h.date) }}</span></span>
                    <span class="flex-1 flex flex-col"><span class="text-[14px] font-semibold">{{ h.name }}</span><span class="text-[12px] text-slate-600">{{ wd(h.date) }}@if (h.isOptional) { · optional }</span></span>
                  </li>
                } @empty { <li class="px-4 py-4 text-[14px] text-slate-600">No more holidays this leave year.</li> }
              </ul>
            </section>
          </div>
        </div>

        <a routerLink="/time-off/apply" class="lg:hidden fixed z-20 right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] h-14 px-5 rounded-full bg-indigo-600 text-white shadow-lg flex items-center gap-2 text-[16px] font-semibold no-underline"><svg lucidePlus [size]="20" aria-hidden="true"></svg>Apply</a>
      }

      @if (explained(); as x) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="explained.set(null)">
          <section role="dialog" aria-modal="true" [attr.aria-label]="x.name + ': how it works'" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[480px] max-h-[88dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" [style.background]="x.color" aria-hidden="true"></span>
              <h2 class="m-0 flex-1 text-[19px] font-bold">{{ x.name }}</h2>
              <button type="button" (click)="explained.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            @if (x.description) { <p class="m-0 text-[15px] text-slate-700">{{ x.description }}</p> }
            <ul class="m-0 pl-5 flex flex-col gap-2 text-[14px] text-slate-800 leading-relaxed">
              @for (l of x.lines; track $index) { <li>{{ l }}</li> }
            </ul>
            @if (ledger(); as lg) {
              <section class="flex flex-col gap-2" aria-labelledby="ledger-h">
                <div class="flex items-baseline gap-2">
                  <h3 id="ledger-h" class="m-0 flex-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Your {{ lg.yearLabel }} so far</h3>
                  @if (lg.yearEnd !== null) { <span class="text-[12px] text-slate-600">about {{ n(lg.yearEnd) }} by year end</span> }
                </div>
                <ul class="list-none m-0 p-0 rounded-12 border border-slate-200 overflow-hidden">
                  @for (e of lg.entries; track $index) {
                    <li class="flex items-start gap-3 px-3 py-2.5 border-b border-slate-100 last:border-b-0 text-[13px]">
                      <span class="w-14 shrink-0 text-slate-500">{{ f(e.date) }}</span>
                      <span class="flex-1 min-w-0 flex flex-col"><span class="text-slate-900">{{ e.label }}</span>@if (e.detail) { <span class="text-[12px] text-slate-500">{{ e.detail }}</span> }
                        @if (e.kind === 'Pending') { <span class="text-[12px] text-amber-700">pending</span> }</span>
                      <span class="mono w-12 text-right font-semibold" [class]="e.days >= 0 ? 'text-emerald-700' : 'text-slate-800'">{{ e.days > 0 ? '+' : '' }}{{ n(e.days) }}</span>
                      @if (!lg.unlimited) { <span class="mono w-10 text-right text-slate-500">{{ n(e.running) }}</span> }
                    </li>
                  } @empty { <li class="px-3 py-3 text-[13px] text-slate-600">Nothing yet this year.</li> }
                </ul>
              </section>
            }
          </section>
        </div>
      }

      @if (shortening(); as r) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="shortening.set(null)">
          <section role="dialog" aria-modal="true" aria-label="Change dates" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[440px] bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <h2 class="m-0 flex-1 text-[19px] font-bold">Cancel some days</h2>
              <button type="button" (click)="shortening.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            <p class="m-0 text-[14px] text-slate-700">{{ r.leaveTypeName }}, {{ rng(r) }}. Keep the days you still want off; the rest go back to your balance. {{ r.status === 'Approved' ? 'It stays approved.' : '' }}</p>
            @if (sError()) { <div class="ws-alert" role="alert">{{ sError() }}</div> }
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">From <input class="ws-input" type="date" [min]="r.from" [max]="sTo()" [value]="sFrom()" (change)="sFrom.set($any($event.target).value)" /></label>
              <label class="ws-field">To <input class="ws-input" type="date" [min]="sFrom()" [max]="r.to" [value]="sTo()" (change)="sTo.set($any($event.target).value)" /></label>
            </div>
            <button type="button" (click)="doShorten(r)" [disabled]="working() || (sFrom() === r.from && sTo() === r.to)" class="ws-btn ws-btn-primary">{{ working() ? 'Saving…' : 'Keep these days' }}</button>
          </section>
        </div>
      }

      @if (cancelling(); as r) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="cancelling.set(null)">
          <section role="dialog" aria-modal="true" aria-label="Cancel request" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[440px] bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <h2 class="m-0 flex-1 text-[19px] font-bold">Cancel this request?</h2>
              <button type="button" (click)="cancelling.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            <p class="m-0 text-[15px] text-slate-700">{{ r.leaveTypeName }}, {{ rng(r) }} ({{ days_(r.days) }}). The days go back to your balance.</p>
            <button type="button" (click)="doCancel(r)" [disabled]="working()" class="ws-btn bg-rose-600 text-white hover:bg-rose-700">{{ working() ? 'Cancelling…' : 'Cancel request' }}</button>
            <button type="button" (click)="cancelling.set(null)" class="ws-btn ws-btn-ghost">Keep it</button>
          </section>
        </div>
      }
    </div>
  `,
})
export class TimeOffPage {
  private readonly svc = inject(TimeOffService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly data = signal<MyTimeOff | null>(null);
  readonly week = signal<LeaveCalendar | null>(null);
  readonly stats = signal<MyStats | null>(null);
  readonly statsLabel = computed(() => (this.stats()?.months ?? []).map(m => `${m.month} ${num(m.days)}`).join(', '));
  statBar(v: number) { const max = Math.max(1, ...(this.stats()?.months ?? []).map(m => m.days)); return v / max * 100; }
  readonly all = signal(false);
  readonly filter = signal<'all' | 'upcoming' | 'pending' | 'past' | 'closed'>('all');
  readonly filters = [{ v: 'all' as const, label: 'All' }, { v: 'upcoming' as const, label: 'Coming up' }, { v: 'pending' as const, label: 'Pending' },
    { v: 'past' as const, label: 'Taken' }, { v: 'closed' as const, label: 'Declined or cancelled' }];
  readonly explained = signal<{ name: string; color: string; description: string | null; lines: string[] } | null>(null);
  readonly ledger = signal<TypeLedger | null>(null);
  readonly today = todayIso();
  async explain(id: string) {
    this.ledger.set(null);
    firstValueFrom(this.svc.ledger(id)).then(x => this.ledger.set(x)).catch(() => {});
    try { this.explained.set(await firstValueFrom(this.svc.explain(id))); }
    catch (e) { this.toast.show(errorText(e, 'Could not load the rules.'), 'error'); }
  }
  readonly cancelling = signal<LeaveRequest | null>(null);
  readonly working = signal(false);

  readonly shown = computed(() => {
    const d = this.data(); if (!d) return [];
    const today = todayIso();
    // Upcoming and pending first (soonest first), then the past (latest first).
    const live = d.requests.filter(r => r.to >= today && (r.status === 'Pending' || r.status === 'Approved')).sort((a, b) => a.from.localeCompare(b.from));
    const rest = d.requests.filter(r => !live.includes(r));
    const f = this.filter();
    const list = [...live, ...rest].filter(r =>
      f === 'all' ? true : f === 'upcoming' ? live.includes(r) : f === 'pending' ? r.status === 'Pending'
      : f === 'past' ? r.to < today && r.status === 'Approved' : r.status === 'Rejected' || r.status === 'Cancelled');
    return this.all() || f !== 'all' ? list : list.slice(0, 6);
  });

  readonly pendingClaims = computed(() => (this.data()?.compOffs ?? []).filter(c => c.status === 'Pending').length);
  readonly upcomingHolidays = computed(() => (this.data()?.holidays ?? []).filter(h => h.date >= todayIso()).slice(0, 4));

  readonly offThisWeek = computed(() => {
    const c = this.week(); if (!c) return [];
    const people = new Map(c.people.map(p => [p.employeeId, p]));
    return c.entries.map((e, i) => {
      const p = people.get(e.employeeId);
      return { key: e.employeeId + i, name: p?.name ?? '', isMe: !!p?.isMe, pending: e.status === 'Pending', when: range(e) };
    });
  });

  constructor() { void this.load(); }

  async load() {
    try {
      const today = todayIso();
      const dow = parseDay(today).getUTCDay();
      const monday = addDays(today, dow === 0 ? -6 : 1 - dow);
      const [d, w] = await Promise.all([firstValueFrom(this.svc.me()), firstValueFrom(this.svc.calendar(monday, addDays(monday, 6), 'team')).catch(() => null)]);
      this.data.set(d); this.week.set(w);
      firstValueFrom(this.svc.myStats()).then(s => this.stats.set(s)).catch(() => {});
    } catch (e) { this.error.set(errorText(e, 'Could not load your time off.')); }
    finally { this.loading.set(false); }
  }

  async attach(r: LeaveRequest, e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    try { await firstValueFrom(this.svc.attach(r.id, f)); this.toast.show('Document added'); await this.load(); }
    catch (err) { this.toast.show(errorText(err, 'Could not add the document.'), 'error'); }
  }
  async open(r: LeaveRequest) {
    try { const x = await firstValueFrom(this.svc.attachment(r.id, r.attachmentName ?? 'document')); saveBlob(x.blob, x.name); }
    catch (err) { this.toast.show(errorText(err, 'Could not open the document.'), 'error'); }
  }

  askCancel(r: LeaveRequest) { this.cancelling.set(r); }

  /** Keep part of a request: new dates inside the old ones (days already taken stay). */
  readonly shortening = signal<LeaveRequest | null>(null);
  readonly sFrom = signal(''); readonly sTo = signal(''); readonly sError = signal<string | null>(null);
  askShorten(r: LeaveRequest) { this.shortening.set(r); this.sFrom.set(r.from); this.sTo.set(r.to); this.sError.set(null); }
  async doShorten(r: LeaveRequest) {
    this.working.set(true); this.sError.set(null);
    const from = this.sFrom(), to = this.sTo();
    const fromHalf: Half = from === r.from ? r.fromHalf : null;
    const toHalf: Half = to === r.to && from !== to ? r.toHalf : null;
    try { const x = await firstValueFrom(this.svc.shorten(r.id, { from, to, fromHalf, toHalf })); this.shortening.set(null); this.toast.show(`Now ${days(x.days)}`); await this.load(); }
    catch (e) { this.sError.set(errorText(e, 'Could not change the dates.')); }
    finally { this.working.set(false); }
  }

  toCalendar(r: LeaveRequest) {
    saveBlob(icsFile([{ title: `${r.leaveTypeName} (out of office)`, from: r.from, to: r.to, note: range(r) }]), `time-off-${r.from}.ics`);
  }
  async doCancel(r: LeaveRequest) {
    this.working.set(true);
    try { await firstValueFrom(this.svc.cancel(r.id)); this.cancelling.set(null); this.toast.show('Request cancelled'); await this.load(); }
    catch (e) { this.toast.show(errorText(e, 'Could not cancel the request.'), 'error'); }
    finally { this.working.set(false); }
  }

  rng(r: LeaveRequest) { return range(r); }
  days_(n: number) { return days(n); }
  n(x: number | null) { return num(x); }
  pill(r: LeaveRequest) { return STATUS_STYLE[r.status]; }
  status(r: LeaveRequest) { return statusText(r); }
  mon(d: string) { return fmt(d).split(' ')[1]; }
  dayNo(d: string) { return fmt(d).split(' ')[0]; }
  wd(d: string) { return weekday(d); }
  f(d: string) { return fmt(d); }
}
