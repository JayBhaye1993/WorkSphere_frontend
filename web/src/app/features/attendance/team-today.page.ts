import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideSearch, LucideChevronRight, LucideDownload } from '@lucide/angular';
import { AttendanceService, STATUS_COLOR, TeamRow, TeamToday, hm } from './attendance.service';
import { errorText } from '../people/people-errors';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { ToastService } from '../../core/services/toast.service';
import { saveBlob } from '../../core/util/download';

type Filter = 'all' | 'in' | 'notyet' | 'late' | 'away';

/** Who is in today: your team (managers) or the whole company (HR). Tap a person for their month. */
@Component({
  standalone: true,
  imports: [RouterLink, SkeletonComponent, LucideArrowLeft, LucideSearch, LucideChevronRight, LucideDownload],
  template: `
    <div class="mx-auto max-w-[820px] min-h-full pb-10">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/attendance" aria-label="Back" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Who's in today</h1>
      </header>
      <div class="p-4 flex flex-col gap-3">
        @if (data()?.canSeeAll) {
          <div class="flex p-1 rounded-full bg-slate-100 self-start" role="tablist">
            @for (s of scopes; track s.id) {
              <button type="button" role="tab" [attr.aria-selected]="scope() === s.id" (click)="setScope(s.id)"
                      class="h-9 px-4 rounded-full border-0 text-[14px] font-semibold cursor-pointer" [class]="scope() === s.id ? 'bg-white shadow-sm text-slate-900' : 'bg-transparent text-slate-600'">{{ s.label }}</button>
            }
          </div>
        }
        @if (loading()) { <ws-skeleton kind="list" [rows]="6" /> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (data()) {
          <div class="grid grid-cols-4 gap-2">
            @for (t of tiles(); track t.id) {
              <button type="button" (click)="filter.set(filter() === t.id ? 'all' : t.id)" [attr.aria-pressed]="filter() === t.id"
                      class="p-2.5 rounded-14 border flex flex-col items-center gap-0.5 cursor-pointer" [class]="filter() === t.id ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200'">
                <span class="text-[20px] font-bold leading-none" [class]="t.cls">{{ t.value }}</span>
                <span class="text-[11px] text-slate-600">{{ t.label }}</span>
              </button>
            }
          </div>
          <label class="relative">
            <span class="sr-only">Search people</span>
            <svg lucideSearch [size]="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"></svg>
            <input class="ws-input !pl-10" placeholder="Search by name" [value]="q()" (input)="q.set($any($event.target).value)" />
          </label>
          <ul class="list-none m-0 p-0 rounded-14 bg-white border border-slate-200 overflow-hidden">
            @for (r of rows(); track r.employeeId) {
              <li class="border-b border-slate-100 last:border-b-0">
                <a [routerLink]="['/attendance/people', r.employeeId]" class="flex items-center gap-3 px-3 py-3 no-underline text-slate-900 hover:bg-slate-50">
                  <span class="w-10 h-10 shrink-0 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[14px] font-bold" aria-hidden="true">{{ initials(r.name) }}</span>
                  <span class="flex-1 min-w-0 flex flex-col">
                    <span class="text-[15px] font-semibold truncate">{{ r.name }}</span>
                    <span class="text-[12px] text-slate-500 truncate">{{ r.designation || '' }}{{ r.day.in ? (r.designation ? ' · ' : '') + 'in ' + r.day.in + (r.day.out ? ', out ' + r.day.out : '') : '' }}{{ r.day.workedMinutes ? ' · ' + hours(r.day.workedMinutes) : '' }}</span>
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-[12px] font-semibold whitespace-nowrap" [class]="color(r).bg + ' ' + color(r).text">{{ r.day.late && r.day.status === 'Working' ? 'In · late' : (r.day.status === 'Leave' || r.day.status === 'HalfLeave' || r.day.status === 'Holiday' ? r.day.label || color(r).label : color(r).label) }}</span>
                  <svg lucideChevronRight [size]="18" class="text-slate-400 shrink-0" aria-hidden="true"></svg>
                </a>
              </li>
            } @empty { <li class="px-4 py-6 text-center text-[14px] text-slate-600">{{ data()!.people.length ? 'Nobody matches.' : 'No one reports to you yet.' }}</li> }
          </ul>
          @if (data()!.people.length) {
            <section class="flex flex-col lg:flex-row lg:items-end gap-2 p-4 rounded-14 bg-white border border-slate-200">
              <div class="flex-1 flex flex-col gap-0.5">
                <h2 class="m-0 text-[15px] font-bold">Monthly register</h2>
                <span class="text-[12px] text-slate-600">Excel: a row per person, a code per day (P, A, L, WFH, HD…), totals and overtime. {{ scope() === 'all' ? 'Everyone.' : 'Your team.' }}</span>
              </div>
              <div class="flex gap-2">
                <label class="sr-only" for="reg-month">Month</label>
                <input id="reg-month" class="ws-input !h-11 !w-auto" type="month" [max]="thisMonth" [value]="month()" (change)="month.set($any($event.target).value)" />
                <button type="button" (click)="download()" [disabled]="downloading() || !month()" class="ws-btn ws-btn-primary !h-11 flex items-center gap-2"><svg lucideDownload [size]="17" aria-hidden="true"></svg>{{ downloading() ? 'Making…' : 'Download' }}</button>
              </div>
            </section>
          }
        }
      </div>
    </div>
  `,
})
export class TeamTodayPage {
  private readonly svc = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  readonly thisMonth = new Date().toISOString().slice(0, 7);
  readonly month = signal(this.thisMonth);
  readonly downloading = signal(false);
  readonly scopes = [{ id: 'team' as const, label: 'My team' }, { id: 'all' as const, label: 'Everyone' }];
  readonly scope = signal<'team' | 'all'>('team');
  readonly data = signal<TeamToday | null>(null);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly filter = signal<Filter>('all'); readonly q = signal('');

  private kind(r: TeamRow): Filter {
    const s = r.day.status;
    if (s === 'Leave' || s === 'HalfLeave' || s === 'Holiday' || s === 'Weekend') return 'away';
    if (s === 'NotYet' || s === 'Absent') return 'notyet';
    return 'in';
  }
  readonly tiles = computed(() => {
    const p = this.data()?.people ?? [];
    const c = (f: Filter) => p.filter(r => this.kind(r) === f).length;
    return [
      { id: 'in' as Filter, label: 'In', value: c('in'), cls: 'text-emerald-700' },
      { id: 'late' as Filter, label: 'Late', value: p.filter(r => r.day.late).length, cls: 'text-amber-700' },
      { id: 'notyet' as Filter, label: 'Not in', value: c('notyet'), cls: 'text-rose-700' },
      { id: 'away' as Filter, label: 'Away', value: c('away'), cls: 'text-violet-700' },
    ];
  });
  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase(), f = this.filter();
    return (this.data()?.people ?? []).filter(r => (!q || r.name.toLowerCase().includes(q))
      && (f === 'all' || (f === 'late' ? r.day.late : this.kind(r) === f)));
  });

  constructor() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set(null);
    try { this.data.set(await firstValueFrom(this.svc.teamToday(this.scope()))); }
    catch (e) { this.error.set(errorText(e, 'Could not load today.')); }
    finally { this.loading.set(false); }
  }
  async download() {
    this.downloading.set(true);
    try { const x = await firstValueFrom(this.svc.register(this.month(), this.scope())); saveBlob(x.blob, x.name); }
    catch (e) { this.toast.show(errorText(e, 'Could not make the register.'), 'error'); }
    finally { this.downloading.set(false); }
  }
  setScope(s: 'team' | 'all') { this.scope.set(s); this.filter.set('all'); void this.load(); }
  color(r: TeamRow) { return STATUS_COLOR[r.day.status] ?? STATUS_COLOR['Upcoming']; }
  hours(m: number) { return hm(m); }
  initials(n: string) { return n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
}
