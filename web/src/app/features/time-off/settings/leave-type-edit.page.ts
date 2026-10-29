import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideCheck } from '@lucide/angular';
import { TimeOffService } from '../time-off.service';
import { LeaveType, LeaveTypeInput } from '../time-off.models';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsService } from '../../settings/settings.service';

const COLORS = ['#0ea5e9', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];

/** Add or change a time off type: allowance, how it builds up, half days, carry forward, documents and who gets it. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideCheck],
  styles: [`
    .seg { height:40px; border:0; border-radius:9px; background:transparent; font:500 14px 'Geist',sans-serif; color:#334155; cursor:pointer; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgb(15 23 42 / .12); }
    .row { display:flex; align-items:center; gap:12px; min-height:56px; padding:8px 0; border-top:1px solid #f1f5f9; }
    .row:first-child { border-top:0; }
    .sw { width:44px; height:26px; accent-color:#4f46e5; cursor:pointer; }
  `],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full pb-32">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings/leave-types" aria-label="Back to time off types" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold truncate">{{ id ? (name() || 'Time off type') : 'New time off type' }}</h1>
      </header>
      @if (loadError()) { <div class="m-4 ws-alert" role="alert">{{ loadError() }}</div> }
      @else {
      <form class="p-4 flex flex-col gap-5" (submit)="$event.preventDefault(); save()">
        <label class="ws-field">Name
          <input class="ws-input" [value]="name()" (input)="name.set($any($event.target).value)" maxlength="100" placeholder="e.g. Casual Leave" [attr.aria-invalid]="tried() && !name().trim()" />
        </label>
        <label class="ws-field">Description <span class="hint">Shown when people apply.</span>
          <textarea class="ws-input" rows="2" maxlength="500" [value]="description()" (input)="description.set($any($event.target).value)"></textarea>
        </label>
        <fieldset class="m-0 p-0 border-0">
          <legend class="p-0 mb-2 text-[14px] font-semibold">Colour</legend>
          <div class="flex flex-wrap gap-2">
            @for (c of colors; track c) {
              <button type="button" (click)="color.set(c)" [attr.aria-label]="'Colour ' + c" [attr.aria-pressed]="color() === c" class="w-10 h-10 rounded-full border-0 flex items-center justify-center cursor-pointer" [style.background]="c">
                @if (color() === c) { <svg lucideCheck [size]="18" class="text-white" aria-hidden="true"></svg> }
              </button>
            }
          </div>
        </fieldset>

        <section class="ws-card !gap-0">
          <h2 class="ws-card-h !mb-2">Allowance</h2>
          <label class="row"><span class="flex-1 text-[15px]">No limit<br /><span class="text-[12px] text-slate-600">For unpaid leave or work from home</span></span><input type="checkbox" class="sw" [checked]="unlimited()" (change)="unlimited.set($any($event.target).checked)" /></label>
          @if (!unlimited()) {
            <label class="row"><span class="flex-1 text-[15px]">Days a year</span><input class="ws-input !w-24 text-right" type="number" min="0.5" max="365" step="0.5" [value]="days()" (input)="days.set($any($event.target).value)" [attr.aria-invalid]="tried() && !daysOk()" /></label>
            <div class="row flex-col !items-stretch">
              <span class="text-[15px]">How it builds up</span>
              <div class="grid grid-cols-2 p-1 rounded-12 bg-slate-100" role="group">
                <button type="button" class="seg" [class.seg-on]="accrual() === 'Yearly'" [attr.aria-pressed]="accrual() === 'Yearly'" (click)="accrual.set('Yearly')">All at the start</button>
                <button type="button" class="seg" [class.seg-on]="accrual() === 'Monthly'" [attr.aria-pressed]="accrual() === 'Monthly'" (click)="accrual.set('Monthly')">Every month</button>
              </div>
              <span class="text-[12px] text-slate-600">People who join mid-year get a share for the months left (joining by the 15th counts the month).</span>
            </div>
            <label class="row"><span class="flex-1 text-[15px]">Carry forward up to<br /><span class="text-[12px] text-slate-600">Unused days that move to next year. 0 for none.</span></span><input class="ws-input !w-24 text-right" type="number" min="0" max="365" step="0.5" [value]="carry()" (input)="carry.set($any($event.target).value)" /></label>
          }
        </section>

        <section class="ws-card !gap-0">
          <h2 class="ws-card-h !mb-2">Rules</h2>
          <label class="row"><span class="flex-1 text-[15px]">Paid</span><input type="checkbox" class="sw" [checked]="paid()" (change)="paid.set($any($event.target).checked)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">Half days allowed</span><input type="checkbox" class="sw" [checked]="half()" (change)="half.set($any($event.target).checked)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">Needs a document<br /><span class="text-[12px] text-slate-600">e.g. a doctor’s note for long sick leave</span></span><input type="checkbox" class="sw" [checked]="docOn()" (change)="docOn.set($any($event.target).checked)" /></label>
          @if (docOn()) {
            <label class="row"><span class="flex-1 text-[15px]">For requests longer than (days)</span><input class="ws-input !w-24 text-right" type="number" min="0" max="365" step="1" [value]="docAfter()" (input)="docAfter.set($any($event.target).value)" /></label>
          }
          <label class="row"><span class="flex-1 text-[15px]">In use<br /><span class="text-[12px] text-slate-600">Switch off to stop new requests; history stays.</span></span><input type="checkbox" class="sw" [checked]="active()" (change)="active.set($any($event.target).checked)" /></label>
        </section>

        <fieldset class="ws-card">
          <legend class="sr-only">Who gets it</legend>
          <h2 class="ws-card-h">Who gets it</h2>
          <p class="m-0 text-[13px] text-slate-600">{{ chosen().length ? 'Only these employment types.' : 'Everyone. Pick employment types to limit it.' }}</p>
          <div class="flex flex-wrap gap-2">
            @for (t of employmentTypes(); track t.id) {
              <button type="button" class="ws-pill" [attr.aria-pressed]="chosen().includes(t.id)" (click)="toggle(t.id)">{{ t.name }}</button>
            } @empty { <span class="text-[13px] text-slate-500">No employment types set up.</span> }
          </div>
        </fieldset>

        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        <div class="fixed lg:static z-20 left-0 right-0 bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-auto px-4 py-3 lg:p-0 bg-white/95 lg:bg-transparent border-t border-slate-200 lg:border-0 flex gap-2">
          @if (id && usedBy() === 0) { <button type="button" (click)="remove()" [disabled]="saving()" class="ws-btn ws-btn-ghost !text-rose-700">Delete</button> }
          <button type="submit" class="ws-btn ws-btn-primary flex-1" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
      }
    </div>
  `,
})
export class LeaveTypeEditPage {
  private readonly svc = inject(TimeOffService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly colors = COLORS;

  readonly name = signal(''); readonly description = signal(''); readonly color = signal(COLORS[0]);
  readonly unlimited = signal(false); readonly days = signal<string | number>(12); readonly accrual = signal<'Yearly' | 'Monthly'>('Yearly');
  readonly carry = signal<string | number>(0); readonly paid = signal(true); readonly half = signal(true);
  readonly docOn = signal(false); readonly docAfter = signal<string | number>(2); readonly active = signal(true);
  readonly chosen = signal<string[]>([]); readonly usedBy = signal(0);
  readonly employmentTypes = signal<{ id: string; name: string }[]>([]);
  readonly tried = signal(false); readonly saving = signal(false);
  readonly error = signal<string | null>(null); readonly loadError = signal<string | null>(null);
  readonly daysOk = computed(() => { const d = Number(this.days()); return d > 0 && d <= 365 && d * 2 === Math.round(d * 2); });

  constructor() { void this.load(); }

  private async load() {
    try {
      const [types, ets] = await Promise.all([
        this.id ? firstValueFrom(this.svc.types()) : Promise.resolve([] as LeaveType[]),
        firstValueFrom(this.settings.list<{ id: string; name: string }>('employment-types')).catch(() => []),
      ]);
      this.employmentTypes.set(ets);
      if (this.id) {
        const t = types.find(x => x.id === this.id);
        if (!t) { this.loadError.set('This type no longer exists.'); return; }
        this.name.set(t.name); this.description.set(t.description ?? ''); this.color.set(t.color);
        this.unlimited.set(t.daysPerYear === null); this.days.set(t.daysPerYear ?? 12); this.accrual.set(t.accrual);
        this.carry.set(t.carryForwardMax); this.paid.set(t.isPaid); this.half.set(t.allowHalfDay);
        this.docOn.set(t.documentAfterDays !== null); this.docAfter.set(t.documentAfterDays ?? 2);
        this.active.set(t.isActive); this.chosen.set(t.employmentTypeIds); this.usedBy.set(t.usedBy);
      }
    } catch (e) { this.loadError.set(errorText(e, 'Could not load this type.')); }
  }

  toggle(id: string) { this.chosen.update(x => x.includes(id) ? x.filter(i => i !== id) : [...x, id]); }

  async save() {
    this.tried.set(true); this.error.set(null);
    if (!this.name().trim()) { this.error.set('Give it a name.'); return; }
    if (!this.unlimited() && !this.daysOk()) { this.error.set('Days a year must be between 0.5 and 365, in half days.'); return; }
    const body: LeaveTypeInput = {
      name: this.name().trim(), description: this.description().trim() || null, color: this.color(),
      daysPerYear: this.unlimited() ? null : Number(this.days()), accrual: this.accrual(),
      isPaid: this.paid(), allowHalfDay: this.half(), carryForwardMax: this.unlimited() ? 0 : Number(this.carry()) || 0,
      documentAfterDays: this.docOn() ? Number(this.docAfter()) || 0 : null, employmentTypeIds: this.chosen(), isActive: this.active(),
    };
    this.saving.set(true);
    try {
      await firstValueFrom(this.id ? this.svc.updateType(this.id, body) : this.svc.createType(body));
      this.toast.show(this.id ? 'Saved' : `${body.name} added`);
      void this.router.navigate(['/more/settings/leave-types']);
    } catch (e) { this.error.set(errorText(e, 'Could not save.')); }
    finally { this.saving.set(false); }
  }

  async remove() {
    if (!this.id) return;
    this.saving.set(true);
    try { await firstValueFrom(this.svc.deleteType(this.id)); this.toast.show('Deleted'); void this.router.navigate(['/more/settings/leave-types']); }
    catch (e) { this.error.set(errorText(e, 'Could not delete.')); }
    finally { this.saving.set(false); }
  }
}
