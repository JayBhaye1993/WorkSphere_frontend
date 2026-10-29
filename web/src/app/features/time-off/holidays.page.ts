import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { Holiday } from './time-off.models';
import { fmt, monthName, parseDay, todayIso, weekday } from './time-off-format';
import { errorText } from '../people/people-errors';
import { AuthService } from '../../core/auth/auth.service';

/** Holidays for your location, a year at a time. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideChevronLeft, LucideChevronRight],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/time-off" aria-label="Back to time off" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Holidays</h1>
        @if (manage) { <a routerLink="/more/settings/holidays" class="mr-3 text-[14px] font-semibold">Manage</a> }
      </header>
      <div class="p-4 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <button type="button" (click)="setYear(year() - 1)" aria-label="Previous year" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer"><svg lucideChevronLeft [size]="20" aria-hidden="true"></svg></button>
          <h2 class="m-0 flex-1 text-center text-[17px] font-bold mono">{{ year() }}</h2>
          <button type="button" (click)="setYear(year() + 1)" aria-label="Next year" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer"><svg lucideChevronRight [size]="20" aria-hidden="true"></svg></button>
        </div>
        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (!loading() && !items().length) { <div class="p-6 rounded-14 bg-white border border-slate-200 text-center text-[14px] text-slate-600">No holidays set for {{ year() }}.</div> }
        @for (g of groups(); track g.month) {
          <section class="flex flex-col gap-2">
            <h3 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">{{ g.month }}</h3>
            <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
              @for (h of g.items; track h.id) {
                <li class="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0" [class.opacity-60]="h.date < today">
                  <span class="w-11 shrink-0 text-center text-[20px] font-bold">{{ dayNo(h.date) }}</span>
                  <span class="flex-1 flex flex-col"><span class="text-[15px] font-semibold">{{ h.name }}</span><span class="text-[12px] text-slate-600">{{ wd(h.date) }}@if (h.isOptional) { · optional: take it from your leave if you want it off }</span></span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
})
export class HolidaysPage {
  private readonly svc = inject(TimeOffService);
  readonly manage = inject(AuthService).can('leave.manage');
  readonly today = todayIso();
  readonly year = signal(new Date().getFullYear());
  readonly items = signal<Holiday[]>([]);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly groups = computed(() => {
    const out: { month: string; items: Holiday[] }[] = [];
    for (const h of this.items()) {
      const m = monthName(parseDay(h.date).getUTCMonth());
      if (!out.length || out[out.length - 1].month !== m) out.push({ month: m, items: [] });
      out[out.length - 1].items.push(h);
    }
    return out;
  });
  constructor() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set(null);
    try { this.items.set(await firstValueFrom(this.svc.holidays(this.year(), true))); }
    catch (e) { this.error.set(errorText(e, 'Could not load holidays.')); }
    finally { this.loading.set(false); }
  }
  setYear(y: number) { this.year.set(y); void this.load(); }
  dayNo(d: string) { return fmt(d).split(' ')[0]; }
  wd(d: string) { return weekday(d); }
}
