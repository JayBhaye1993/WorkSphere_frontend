import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { LucideArrowLeft, LucideDownload } from '@lucide/angular';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api/api.service';
import { errorText } from '../people/people-errors';
import { AvatarComponent } from '../../shared/avatar.component';
import { ToastService } from '../../core/services/toast.service';
import { fileNameFrom, saveBlob } from '../../core/util/download';
import { num } from './time-off-format';

interface PersonDays { employeeId: string; name: string; designation: string | null; days: number; detail: string | null; }
interface Overview {
  scope: 'team' | 'all'; canSeeAll: boolean; year: number; yearLabel: string; people: number; daysTaken: number; pendingRequests: number;
  unplannedRequests: number; offToday: PersonDays[]; mostLeave: PersonDays[]; unplanned: PersonDays[]; noLeave: PersonDays[];
  balanceTypes: string[]; balances: { employeeId: string; name: string; designation: string | null; available: (number | null)[] }[];
  months: { month: string; days: number }[];
}

/** For managers and HR: who's off today, how the year is going, and everyone's balances, with the Excel register. */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, LucideArrowLeft, LucideDownload],
  template: `
    <div class="mx-auto max-w-[960px] min-h-full pb-10">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/time-off" aria-label="Back to time off" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">{{ scope() === 'all' ? 'Company leave' : 'Team leave' }}@if (data(); as d) { <span class="mono text-[13px] font-medium text-slate-500"> {{ d.yearLabel }}</span> }</h1>
        @if (data()?.canSeeAll) {
          <div class="flex p-1 rounded-full bg-slate-100" role="group" aria-label="Whose leave">
            <button type="button" (click)="setScope('team')" [attr.aria-pressed]="scope() === 'team'" class="h-8 px-3 rounded-full border-0 text-[13px] font-semibold cursor-pointer" [class]="scope() === 'team' ? 'bg-white shadow-sm text-slate-900' : 'bg-transparent text-slate-600'">Team</button>
            <button type="button" (click)="setScope('all')" [attr.aria-pressed]="scope() === 'all'" class="h-8 px-3 rounded-full border-0 text-[13px] font-semibold cursor-pointer" [class]="scope() === 'all' ? 'bg-white shadow-sm text-slate-900' : 'bg-transparent text-slate-600'">Everyone</button>
          </div>
        }
        <button type="button" (click)="export()" [disabled]="exporting()" aria-label="Download the leave register (Excel)" title="Download the leave register (Excel)" class="w-11 h-11 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 text-slate-800 cursor-pointer"><svg lucideDownload [size]="20" aria-hidden="true"></svg></button>
      </header>

      @if (loading()) {
        <div class="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true">
          @for (i of [1,2,3,4]; track i) { <div class="h-[84px] rounded-14 bg-slate-100 animate-pulse"></div> }
          <div class="col-span-2 lg:col-span-4 h-40 rounded-14 bg-slate-100 animate-pulse"></div>
        </div>
      } @else if (error()) { <div class="m-4 ws-alert" role="alert">{{ error() }}</div> }
      @else if (data()) {
        @let d = data()!;
        <div class="p-4 flex flex-col gap-5">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="p-3.5 rounded-14 bg-white border border-slate-200"><span class="block text-[12px] text-slate-600">Off today</span><span class="text-[26px] font-bold">{{ d.offToday.length }}</span><span class="text-[13px] text-slate-500"> of {{ d.people }}</span></div>
            <div class="p-3.5 rounded-14 bg-white border border-slate-200"><span class="block text-[12px] text-slate-600">Waiting for approval</span><span class="text-[26px] font-bold" [class.text-amber-700]="d.pendingRequests > 0">{{ d.pendingRequests }}</span></div>
            <div class="p-3.5 rounded-14 bg-white border border-slate-200"><span class="block text-[12px] text-slate-600">Days taken this year</span><span class="text-[26px] font-bold">{{ n(d.daysTaken) }}</span><span class="block text-[12px] text-slate-500">avg {{ avg() < 0.1 && avg() > 0 ? 'under 0.1' : n(avg()) }} a person</span></div>
            <div class="p-3.5 rounded-14 bg-white border border-slate-200"><span class="block text-[12px] text-slate-600">Unplanned (no notice)</span><span class="text-[26px] font-bold">{{ d.unplannedRequests }}</span></div>
          </div>

          <section class="p-4 rounded-14 bg-white border border-slate-200 flex flex-col gap-3" aria-labelledby="mo-h">
            <h2 id="mo-h" class="m-0 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Days taken by month</h2>
            <div class="h-32 flex items-end gap-1.5" role="img" [attr.aria-label]="monthsLabel()">
              @for (m of d.months; track m.month) {
                <div class="flex-1 h-full flex flex-col justify-end items-center gap-1">
                  @if (m.days > 0) { <span class="text-[10px] text-slate-600 mono">{{ n(m.days) }}</span> }
                  <div class="w-full rounded-t-[4px] bg-indigo-500" [style.height.%]="bar(m.days)" [class.!bg-slate-200]="m.days === 0" [style.min-height.px]="2"></div>
                  <span class="text-[10px] text-slate-500">{{ m.month.slice(0, 1) }}<span class="hidden sm:inline">{{ m.month.slice(1) }}</span></span>
                </div>
              }
            </div>
          </section>

          <div class="grid gap-5 lg:grid-cols-2">
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Off today</h2>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (p of d.offToday; track p.employeeId) { <li class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0"><ws-avatar [name]="p.name" [size]="32" /><a [routerLink]="['/people', p.employeeId]" class="flex-1 min-w-0 text-[14px] font-semibold text-slate-900 no-underline truncate">{{ p.name }}</a><span class="text-[12px] text-slate-600">{{ p.detail }}{{ p.days === 0.5 ? ' · half' : '' }}</span></li> }
                @empty { <li class="px-4 py-4 text-[14px] text-slate-600">Everyone is in today.</li> }
              </ul>
            </section>
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Most leave this year</h2>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (p of d.mostLeave; track p.employeeId) { <li class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0"><ws-avatar [name]="p.name" [size]="32" /><a [routerLink]="['/people', p.employeeId]" class="flex-1 min-w-0 text-[14px] font-semibold text-slate-900 no-underline truncate">{{ p.name }}</a><span class="mono text-[13px]">{{ n(p.days) }} d</span></li> }
                @empty { <li class="px-4 py-4 text-[14px] text-slate-600">No leave taken yet.</li> }
              </ul>
            </section>
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Unplanned leave</h2>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (p of d.unplanned; track p.employeeId) { <li class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0"><ws-avatar [name]="p.name" [size]="32" /><a [routerLink]="['/people', p.employeeId]" class="flex-1 min-w-0 text-[14px] font-semibold text-slate-900 no-underline truncate">{{ p.name }}</a><span class="text-[12px] text-slate-600">{{ p.detail }} · {{ n(p.days) }} d</span></li> }
                @empty { <li class="px-4 py-4 text-[14px] text-slate-600">All leave was applied in advance.</li> }
              </ul>
            </section>
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">No leave yet this year</h2>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (p of d.noLeave; track p.employeeId) { <li class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0"><ws-avatar [name]="p.name" [size]="32" /><a [routerLink]="['/people', p.employeeId]" class="flex-1 min-w-0 text-[14px] font-semibold text-slate-900 no-underline truncate">{{ p.name }}</a><span class="text-[12px] text-slate-500">{{ p.designation }}</span></li> }
                @empty { <li class="px-4 py-4 text-[14px] text-slate-600">Everyone has had a break.</li> }
              </ul>
            </section>
          </div>

          <section class="flex flex-col gap-2" aria-labelledby="bal-h">
            <div class="flex items-center px-1 gap-2">
              <h2 id="bal-h" class="m-0 flex-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Days left</h2>
              <input class="ws-input !h-10 !w-44 text-[14px]" type="search" placeholder="Find a person" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Find a person" />
            </div>
            <div class="bg-white border border-slate-200 rounded-14 overflow-x-auto">
              <table class="w-full border-collapse text-[14px]">
                <thead><tr class="bg-slate-50">
                  <th class="sticky left-0 bg-slate-50 text-left font-semibold text-[12px] text-slate-600 px-4 py-2.5 min-w-[160px]">Person</th>
                  @for (t of d.balanceTypes; track t) { <th class="text-right font-semibold text-[12px] text-slate-600 px-3 py-2.5 whitespace-nowrap">{{ t }}</th> }
                </tr></thead>
                <tbody>
                  @for (b of rows(); track b.employeeId) {
                    <tr class="border-t border-slate-100">
                      <td class="sticky left-0 bg-white px-4 py-2"><a [routerLink]="['/people', b.employeeId]" class="font-semibold text-slate-900 no-underline">{{ b.name }}</a></td>
                      @for (v of b.available; track $index) { <td class="text-right px-3 py-2 mono" [class.text-rose-700]="v !== null && v <= 0" [class.text-slate-400]="v === null">{{ v === null ? '–' : n(v) }}</td> }
                    </tr>
                  } @empty { <tr><td class="px-4 py-4 text-slate-600" [attr.colspan]="d.balanceTypes.length + 1">Nobody matches.</td></tr> }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class TeamLeavePage {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly base = `${environment.apiUrls.hr}/api/v1/leave`;
  readonly scope = signal<'team' | 'all'>('team');
  readonly data = signal<Overview | null>(null);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly q = signal('');
  readonly rows = computed(() => { const s = this.q().trim().toLowerCase(); return (this.data()?.balances ?? []).filter(b => !s || b.name.toLowerCase().includes(s)); });
  readonly avg = computed(() => { const d = this.data(); return d && d.people ? d.daysTaken / d.people : 0; });
  private readonly max = computed(() => Math.max(1, ...(this.data()?.months ?? []).map(m => m.days)));
  readonly monthsLabel = computed(() => (this.data()?.months ?? []).map(m => `${m.month} ${num(m.days)}`).join(', '));

  constructor() { void this.load(); }

  async load() {
    this.loading.set(true); this.error.set(null);
    try { this.data.set(await firstValueFrom(this.api.get<Overview>(`${this.base}/overview`, { scope: this.scope() }))); }
    catch (e) {
      // Managers with nobody below them, but HR: show everyone instead.
      if (this.scope() === 'team') {
        try { this.data.set(await firstValueFrom(this.api.get<Overview>(`${this.base}/overview`, { scope: 'all' }))); this.scope.set('all'); return; } catch { /* keep the first error */ }
      }
      this.error.set(errorText(e, 'Could not load the overview.'));
    }
    finally { this.loading.set(false); }
  }
  setScope(s: 'team' | 'all') { this.scope.set(s); void this.load(); }
  async export() {
    this.exporting.set(true);
    try {
      const x = await firstValueFrom(this.http.get(`${this.base}/reports/register`, { params: { scope: this.scope() }, responseType: 'blob', observe: 'response' })
        .pipe(map(r => ({ blob: r.body!, name: fileNameFrom(r.headers.get('Content-Disposition'), 'leave-register.xlsx') }))));
      saveBlob(x.blob, x.name);
    } catch (e) { this.toast.show(errorText(e, 'Could not download the register.'), 'error'); }
    finally { this.exporting.set(false); }
  }
  bar(v: number) { return (v / this.max()) * 100; }
  n(v: number) { return num(v); }
}
