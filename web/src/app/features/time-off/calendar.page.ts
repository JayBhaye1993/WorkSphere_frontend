import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { CalendarEntry, LeaveCalendar } from './time-off.models';
import { addDays, halfLabel, isoDay, monthName, parseDay, todayIso, weekday, fmt } from './time-off-format';
import { errorText } from '../people/people-errors';
import { AvatarComponent } from '../../shared/avatar.component';

interface Cell { date: string; day: number; inMonth: boolean; weekend: boolean; holiday: string | null; off: { name: string; color: string; pending: boolean }[]; }

/** Who's off: a month at a time for your team (or everyone, for HR). Tap a day to see the people. */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, LucideArrowLeft, LucideChevronLeft, LucideChevronRight],
  template: `
    <div class="mx-auto max-w-[820px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/time-off" aria-label="Back to time off" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Who’s off</h1>
        @if (cal()?.canSeeAll) {
          <div class="flex p-1 rounded-full bg-slate-100 mr-2" role="group" aria-label="Whose time off">
            <button type="button" (click)="setScope('team')" [attr.aria-pressed]="scope() === 'team'" class="h-8 px-3 rounded-full border-0 text-[13px] font-semibold cursor-pointer" [class]="scope() === 'team' ? 'bg-white shadow-sm text-slate-900' : 'bg-transparent text-slate-600'">Team</button>
            <button type="button" (click)="setScope('all')" [attr.aria-pressed]="scope() === 'all'" class="h-8 px-3 rounded-full border-0 text-[13px] font-semibold cursor-pointer" [class]="scope() === 'all' ? 'bg-white shadow-sm text-slate-900' : 'bg-transparent text-slate-600'">Everyone</button>
          </div>
        }
      </header>
      <div class="p-4 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <button type="button" (click)="move(-1)" aria-label="Previous month" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer hover:bg-slate-50"><svg lucideChevronLeft [size]="20" aria-hidden="true"></svg></button>
          <h2 class="m-0 flex-1 text-center text-[17px] font-bold">{{ title() }}</h2>
          <button type="button" (click)="move(1)" aria-label="Next month" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer hover:bg-slate-50"><svg lucideChevronRight [size]="20" aria-hidden="true"></svg></button>
        </div>
        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }

        <div class="rounded-14 bg-white border border-slate-200 overflow-hidden" [class.opacity-60]="loading()">
          <div class="grid grid-cols-7 border-b border-slate-200">
            @for (h of heads; track h) { <span class="py-2 text-center text-[11px] font-semibold uppercase text-slate-500">{{ h }}</span> }
          </div>
          <div class="grid grid-cols-7">
            @for (c of cells(); track c.date) {
              <button type="button" (click)="selected.set(c.date)" [attr.aria-pressed]="selected() === c.date"
                      [attr.aria-label]="label(c)"
                      class="min-h-[58px] lg:min-h-[84px] p-1 lg:p-1.5 border-0 border-b border-r border-slate-100 flex flex-col items-start gap-1 text-left cursor-pointer"
                      [class]="cellClass(c)">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold" [class]="c.date === today ? 'bg-indigo-600 text-white' : ''">{{ c.day }}</span>
                @if (c.holiday) { <span class="hidden lg:block w-full truncate text-[10px] font-semibold text-emerald-800">{{ c.holiday }}</span><span class="lg:hidden w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true"></span> }
                @if (c.off.length) {
                  <span class="flex flex-wrap gap-0.5">
                    @for (o of c.off.slice(0, 3); track $index) { <span class="w-2 h-2 rounded-full" [style.background]="o.color" [class.opacity-50]="o.pending" aria-hidden="true"></span> }
                    @if (c.off.length > 3) { <span class="text-[10px] leading-none text-slate-600">+{{ c.off.length - 3 }}</span> }
                  </span>
                }
              </button>
            }
          </div>
        </div>

        <section class="flex flex-col gap-2" aria-live="polite">
          <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">{{ dayTitle() }}</h2>
          @let sel = selectedCell();
          @if (sel?.holiday) { <p class="m-0 px-4 py-3 rounded-14 bg-emerald-50 border border-emerald-200 text-[14px] text-emerald-900">{{ sel!.holiday }}: a holiday</p> }
          <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
            @for (o of dayList(); track $index) {
              <li class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0">
                <ws-avatar [name]="o.name" [size]="34" />
                <span class="flex-1 min-w-0 flex flex-col">
                  <span class="text-[14px] font-semibold truncate">{{ o.name }}@if (o.isMe) { <span class="font-normal text-slate-500"> (you)</span> }</span>
                  <span class="text-[12px] text-slate-600"><span class="inline-block w-2 h-2 rounded-full mr-1" [style.background]="o.color" aria-hidden="true"></span>{{ o.label }}{{ o.part ? ' · ' + o.part : '' }}@if (o.pending) { · <span class="text-amber-700">pending</span> }</span>
                </span>
              </li>
            } @empty { <li class="px-4 py-4 text-[14px] text-slate-600">{{ sel?.weekend ? 'Weekend.' : 'Everyone is in.' }}</li> }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class CalendarPage {
  private readonly svc = inject(TimeOffService);
  readonly heads = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly today = todayIso();
  readonly month = signal(this.today.slice(0, 7) + '-01');
  readonly scope = signal<'team' | 'all'>('team');
  readonly selected = signal(this.today);
  readonly cal = signal<LeaveCalendar | null>(null);
  readonly loading = signal(true); readonly error = signal<string | null>(null);

  readonly title = computed(() => { const d = parseDay(this.month()); return `${monthName(d.getUTCMonth())} ${d.getUTCFullYear()}`; });

  private gridStart(): string { const d = parseDay(this.month()); const dow = d.getUTCDay(); return addDays(this.month(), dow === 0 ? -6 : 1 - dow); }

  readonly cells = computed<Cell[]>(() => {
    const c = this.cal(); const start = this.gridStart(); const m = parseDay(this.month()).getUTCMonth();
    const names = new Map((c?.people ?? []).map(p => [p.employeeId, p.name]));
    const out: Cell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(start, i); const d = parseDay(date);
      if (i >= 35 && d.getUTCMonth() !== m) break;
      const weekend = (c?.weekendDays ?? [0, 6]).includes(d.getUTCDay());
      const holiday = c?.holidays.find(h => h.date === date && !h.isOptional)?.name ?? null;
      const off = weekend || holiday ? [] : (c?.entries ?? []).filter(e => e.from <= date && e.to >= date)
        .map(e => ({ name: names.get(e.employeeId) ?? '', color: e.color, pending: e.status === 'Pending' }));
      out.push({ date, day: d.getUTCDate(), inMonth: d.getUTCMonth() === m, weekend, holiday, off });
    }
    return out;
  });

  readonly selectedCell = computed(() => this.cells().find(c => c.date === this.selected()) ?? null);
  readonly dayTitle = computed(() => `${weekday(this.selected())} ${fmt(this.selected())}`);
  readonly dayList = computed(() => {
    const c = this.cal(); const date = this.selected(); const cell = this.selectedCell();
    if (!c || cell?.weekend || cell?.holiday) return [];
    const people = new Map(c.people.map(p => [p.employeeId, p]));
    return c.entries.filter(e => e.from <= date && e.to >= date).map(e => ({
      name: people.get(e.employeeId)?.name ?? '', isMe: !!people.get(e.employeeId)?.isMe, color: e.color, label: e.label,
      pending: e.status === 'Pending', part: this.part(e, date),
    }));
  });

  constructor() { void this.load(); }

  private part(e: CalendarEntry, date: string): string {
    if (e.from === e.to) return e.fromHalf ? halfLabel(e.fromHalf) : '';
    if (date === e.from && e.fromHalf) return halfLabel(e.fromHalf);
    if (date === e.to && e.toHalf) return halfLabel(e.toHalf);
    return '';
  }

  async load() {
    this.loading.set(true); this.error.set(null);
    const start = this.gridStart();
    try { this.cal.set(await firstValueFrom(this.svc.calendar(start, addDays(start, 41), this.scope()))); }
    catch (e) { this.error.set(errorText(e, 'Could not load the calendar.')); }
    finally { this.loading.set(false); }
  }

  move(n: number) {
    const d = parseDay(this.month()); d.setUTCMonth(d.getUTCMonth() + n);
    this.month.set(isoDay(d));
    this.selected.set(this.month().slice(0, 7) === this.today.slice(0, 7) ? this.today : this.month());
    void this.load();
  }
  setScope(s: 'team' | 'all') { this.scope.set(s); void this.load(); }

  cellClass(c: Cell): string {
    const sel = this.selected() === c.date ? ' ring-2 ring-inset ring-indigo-500' : '';
    const bg = c.holiday ? 'bg-emerald-50' : c.weekend ? 'bg-slate-50' : 'bg-white hover:bg-slate-50';
    return `${bg}${sel} ${c.inMonth ? 'text-slate-900' : 'text-slate-400'}`;
  }
  label(c: Cell): string {
    const parts = [`${weekday(c.date)} ${fmt(c.date)}`];
    if (c.holiday) parts.push(c.holiday); else if (c.weekend) parts.push('weekend');
    if (c.off.length) parts.push(`${c.off.length} off`);
    return parts.join(', ');
  }
}
