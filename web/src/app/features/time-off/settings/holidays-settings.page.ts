import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronLeft, LucideChevronRight, LucidePlus, LucideX } from '@lucide/angular';
import { TimeOffService } from '../time-off.service';
import { Holiday } from '../time-off.models';
import { fmt, weekday } from '../time-off-format';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsService } from '../../settings/settings.service';

interface Draft { id: string | null; date: string; name: string; isOptional: boolean; locationIds: string[]; }

/** Settings › Holidays: the company's holiday list, each for every location or only some. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideChevronLeft, LucideChevronRight, LucidePlus, LucideX],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Holidays</h1>
        <button type="button" (click)="open(null)" aria-label="Add a holiday" class="w-11 h-11 mr-1 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 text-indigo-700 cursor-pointer"><svg lucidePlus [size]="22" aria-hidden="true"></svg></button>
      </header>
      <div class="p-4 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <button type="button" (click)="setYear(year() - 1)" aria-label="Previous year" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer"><svg lucideChevronLeft [size]="20" aria-hidden="true"></svg></button>
          <h2 class="m-0 flex-1 text-center text-[17px] font-bold mono">{{ year() }}</h2>
          <button type="button" (click)="setYear(year() + 1)" aria-label="Next year" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer"><svg lucideChevronRight [size]="20" aria-hidden="true"></svg></button>
        </div>
        <p class="m-0 px-1 text-[13px] text-slate-600">Holidays aren’t counted as leave. Optional ones are listed but people use their leave to take them.</p>
        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
          @for (h of items(); track h.id) {
            <li class="border-b border-slate-100 last:border-b-0">
              <button type="button" (click)="open(h)" class="w-full flex items-center gap-3 min-h-[60px] px-4 py-2 bg-transparent border-0 text-left cursor-pointer hover:bg-slate-50">
                <span class="w-16 shrink-0 text-[14px] font-semibold">{{ f(h.date) }}</span>
                <span class="flex-1 min-w-0 flex flex-col"><span class="text-[15px] font-semibold text-slate-900">{{ h.name }}</span>
                  <span class="text-[12px] text-slate-600">{{ wd(h.date) }} · {{ where(h) }}@if (h.isOptional) { · optional }</span></span>
                <svg lucideChevronRight [size]="16" class="text-slate-400" aria-hidden="true"></svg>
              </button>
            </li>
          } @empty { <li class="px-4 py-5 text-[14px] text-slate-600">{{ loading() ? 'Loading…' : 'No holidays for ' + year() + ' yet.' }}</li> }
        </ul>
      </div>

      @if (draft(); as d) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="draft.set(null)">
          <section role="dialog" aria-modal="true" [attr.aria-label]="d.id ? 'Edit holiday' : 'Add holiday'" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[480px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <h2 class="m-0 flex-1 text-[19px] font-bold">{{ d.id ? 'Edit holiday' : 'Add holiday' }}</h2>
              <button type="button" (click)="draft.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }
            <label class="ws-field">Name <input class="ws-input" [value]="d.name" (input)="patch({ name: $any($event.target).value })" maxlength="150" placeholder="e.g. Diwali" /></label>
            <label class="ws-field">Date <input class="ws-input" type="date" [value]="d.date" (change)="patch({ date: $any($event.target).value })" /></label>
            <label class="flex items-center gap-3 min-h-[44px] text-[15px]"><input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="d.isOptional" (change)="patch({ isOptional: $any($event.target).checked })" />Optional holiday</label>
            <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
              <legend class="p-0 mb-1 text-[14px] font-semibold">Locations</legend>
              <span class="text-[12px] text-slate-600">{{ d.locationIds.length ? 'Only these locations.' : 'All locations.' }}</span>
              <div class="flex flex-wrap gap-2">
                @for (l of locations(); track l.id) { <button type="button" class="ws-pill" [attr.aria-pressed]="d.locationIds.includes(l.id)" (click)="toggleLoc(l.id)">{{ l.name }}</button> }
              </div>
            </fieldset>
            <div class="flex gap-2">
              @if (d.id) { <button type="button" (click)="remove(d)" [disabled]="saving()" class="ws-btn ws-btn-ghost !text-rose-700">Delete</button> }
              <button type="button" (click)="save(d)" [disabled]="saving() || !d.name.trim() || !d.date" class="ws-btn ws-btn-primary flex-1">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class HolidaysSettingsPage {
  private readonly svc = inject(TimeOffService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  readonly year = signal(new Date().getFullYear());
  readonly items = signal<Holiday[]>([]);
  readonly locations = signal<{ id: string; name: string }[]>([]);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly draft = signal<Draft | null>(null);
  readonly saving = signal(false); readonly sheetError = signal<string | null>(null);
  private readonly locName = computed(() => new Map(this.locations().map(l => [l.id, l.name])));

  constructor() {
    void this.load();
    firstValueFrom(this.settings.list<{ id: string; name: string }>('locations')).then(x => this.locations.set(x)).catch(() => {});
  }
  async load() {
    this.loading.set(true); this.error.set(null);
    try { this.items.set(await firstValueFrom(this.svc.holidays(this.year()))); }
    catch (e) { this.error.set(errorText(e, 'Could not load holidays.')); }
    finally { this.loading.set(false); }
  }
  setYear(y: number) { this.year.set(y); void this.load(); }
  open(h: Holiday | null) {
    this.sheetError.set(null);
    this.draft.set(h ? { id: h.id, date: h.date, name: h.name, isOptional: h.isOptional, locationIds: [...h.locationIds] }
                     : { id: null, date: `${this.year()}-01-01`, name: '', isOptional: false, locationIds: [] });
  }
  patch(p: Partial<Draft>) { this.draft.update(d => d ? { ...d, ...p } : d); }
  toggleLoc(id: string) { const d = this.draft(); if (!d) return; this.patch({ locationIds: d.locationIds.includes(id) ? d.locationIds.filter(x => x !== id) : [...d.locationIds, id] }); }
  async save(d: Draft) {
    this.saving.set(true); this.sheetError.set(null);
    const body = { date: d.date, name: d.name.trim(), isOptional: d.isOptional, locationIds: d.locationIds };
    try {
      await firstValueFrom(d.id ? this.svc.updateHoliday(d.id, body) : this.svc.createHoliday(body));
      this.draft.set(null); this.toast.show('Saved');
      if (d.date.slice(0, 4) !== String(this.year())) this.year.set(Number(d.date.slice(0, 4)));
      await this.load();
    } catch (e) { this.sheetError.set(errorText(e, 'Could not save the holiday.')); }
    finally { this.saving.set(false); }
  }
  async remove(d: Draft) {
    if (!d.id) return;
    this.saving.set(true);
    try { await firstValueFrom(this.svc.deleteHoliday(d.id)); this.draft.set(null); this.toast.show('Deleted'); await this.load(); }
    catch (e) { this.sheetError.set(errorText(e, 'Could not delete.')); }
    finally { this.saving.set(false); }
  }
  where(h: Holiday) { return h.locationIds.length ? h.locationIds.map(id => this.locName().get(id) ?? '…').join(', ') : 'All locations'; }
  f(d: string) { return fmt(d); }
  wd(d: string) { return weekday(d); }
}
