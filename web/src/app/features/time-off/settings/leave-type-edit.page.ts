import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideCheck, LucidePlus, LucideX } from '@lucide/angular';
import { TimeOffService } from '../time-off.service';
import { ApprovalFlow, LeaveRules, LeaveType, LeaveTypeInput, NO_RULES, TenureStep } from '../time-off.models';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsService } from '../../settings/settings.service';

const COLORS = ['#0ea5e9', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];

/** Add or change a time off type: allowance, how it builds up, half days, carry forward, documents and who gets it. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideCheck, LucidePlus, LucideX],
  styles: [`
    .seg { height:40px; border:0; border-radius:9px; background:transparent; font:500 14px 'Geist',sans-serif; color:#334155; cursor:pointer; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgb(15 23 42 / .12); }
    .row { display:flex; align-items:center; gap:12px; min-height:56px; padding:8px 0; border-top:1px solid #f1f5f9; }
    .row:first-child { border-top:0; }
    .sw { width:44px; height:26px; accent-color:#4f46e5; cursor:pointer; }
    .num { width:88px !important; text-align:right; }
    .flow { min-height:64px; padding:10px 12px; border-radius:12px; border:1px solid #cbd5e1; background:#fff; text-align:left; cursor:pointer; display:flex; flex-direction:column; gap:2px; }
    .flow[aria-pressed=true] { border-color:#4f46e5; box-shadow:0 0 0 3px #e0e7ff; }
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

        <section class="ws-card !gap-0">
          <h2 class="ws-card-h !mb-1">Limits</h2>
          <p class="m-0 mb-1 text-[12px] text-slate-600">Leave a box empty for no limit.</p>
          <label class="row"><span class="flex-1 text-[15px]">At least (days per request)</span><input class="ws-input num" type="number" min="0.5" step="0.5" [value]="rv('minDaysPerRequest')" (input)="setNum('minDaysPerRequest', $event)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">At most in one go (days)</span><input class="ws-input num" type="number" min="0.5" step="0.5" [value]="rv('maxDaysPerRequest')" (input)="setNum('maxDaysPerRequest', $event)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">At most a month (days)</span><input class="ws-input num" type="number" min="0.5" step="0.5" [value]="rv('maxDaysPerMonth')" (input)="setNum('maxDaysPerMonth', $event)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">Notice needed (days ahead)<br /><span class="text-[12px] text-slate-600">HR applying for someone isn’t held to this.</span></span><input class="ws-input num" type="number" min="0" step="1" [value]="rv('noticeDays')" (input)="setNum('noticeDays', $event)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">Can apply up to (days after the date)<br /><span class="text-[12px] text-slate-600">0 = no past dates. Empty = any time this year.</span></span><input class="ws-input num" type="number" min="0" step="1" [value]="rv('backdateDays')" (input)="setNum('backdateDays', $event)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">Usable after joining (days)<br /><span class="text-[12px] text-slate-600">e.g. 90 for after probation</span></span><input class="ws-input num" type="number" min="0" step="1" [value]="rv('eligibleAfterDays')" (input)="setNum('eligibleAfterDays', $event)" /></label>
          @if (!unlimited()) {
            <label class="row"><span class="flex-1 text-[15px]">May go below zero by (days)</span><input class="ws-input num" type="number" min="0" step="0.5" [value]="rules().negativeAllowed" (input)="setNum('negativeAllowed', $event, 0)" /></label>
          }
          <label class="row"><span class="flex-1 text-[15px]">Reason required</span><input type="checkbox" class="sw" [checked]="rules().reasonRequired" (change)="setFlag('reasonRequired', $event)" /></label>
        </section>

        <section class="ws-card !gap-0">
          <h2 class="ws-card-h !mb-1">Sandwich rule</h2>
          <p class="m-0 mb-1 text-[12px] text-slate-600">Days off between two leave days count as leave, e.g. Friday and Monday off makes 4 days.</p>
          <label class="row"><span class="flex-1 text-[15px]">Count weekends in between</span><input type="checkbox" class="sw" [checked]="rules().sandwichWeekends" (change)="setFlag('sandwichWeekends', $event)" /></label>
          <label class="row"><span class="flex-1 text-[15px]">Count holidays in between</span><input type="checkbox" class="sw" [checked]="rules().sandwichHolidays" (change)="setFlag('sandwichHolidays', $event)" /></label>
          @if (rules().sandwichWeekends || rules().sandwichHolidays) {
            <label class="row"><span class="flex-1 text-[15px]">Only when leave is at least (working days)</span><input class="ws-input num" type="number" min="1" step="1" [value]="rv('sandwichMinDays')" (input)="setNum('sandwichMinDays', $event)" /></label>
            <label class="row"><span class="flex-1 text-[15px]">Also between two separate requests<br /><span class="text-[12px] text-slate-600">Friday and Monday applied one at a time</span></span><input type="checkbox" class="sw" [checked]="rules().sandwichAcrossRequests" (change)="setFlag('sandwichAcrossRequests', $event)" /></label>
          }
        </section>

        @if (!unlimited()) {
          <section class="ws-card">
            <h2 class="ws-card-h">More days with service</h2>
            @for (t of rules().tenure; track $index; let i = $index) {
              <div class="flex items-center gap-2 text-[15px]">
                <span>After</span><input class="ws-input num" type="number" min="1" step="1" [value]="t.afterYears" (input)="setTenure(i, 'afterYears', $event)" aria-label="Years of service" />
                <span>years, +</span><input class="ws-input num" type="number" min="0.5" step="0.5" [value]="t.extraDays" (input)="setTenure(i, 'extraDays', $event)" aria-label="Extra days" /><span>days</span>
                <button type="button" (click)="removeTenure(i)" aria-label="Remove this step" class="ml-auto w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="18" aria-hidden="true"></svg></button>
              </div>
            } @empty { <p class="m-0 text-[13px] text-slate-600">Everyone gets the same days. Add a step to reward long service.</p> }
            <button type="button" (click)="addTenure()" class="self-start flex items-center gap-1 p-0 bg-transparent border-0 text-[14px] font-semibold text-indigo-700 cursor-pointer"><svg lucidePlus [size]="16" aria-hidden="true"></svg>Add a step</button>
          </section>
        }

        @if (others().length) {
          <fieldset class="ws-card">
            <legend class="sr-only">Not next to</legend>
            <h2 class="ws-card-h">Can’t be taken next to</h2>
            <p class="m-0 text-[13px] text-slate-600">Weekends and holidays in between don’t separate them.</p>
            <div class="flex flex-wrap gap-2">
              @for (t of others(); track t.id) { <button type="button" class="ws-pill" [attr.aria-pressed]="rules().noClubWith.includes(t.id)" (click)="toggleClub(t.id)">{{ t.name }}</button> }
            </div>
          </fieldset>
        }

        <fieldset class="ws-card">
          <legend class="sr-only">Approval</legend>
          <h2 class="ws-card-h">Approval</h2>
          @for (f of flows; track f.v) {
            <button type="button" class="flow" [attr.aria-pressed]="rules().approvalFlow === f.v" (click)="setFlow(f.v)">
              <span class="text-[15px] font-semibold text-slate-900">{{ f.label }}</span><span class="text-[12px] text-slate-600">{{ f.hint }}</span>
            </button>
          }
        </fieldset>

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
  readonly rules = signal<LeaveRules>({ ...NO_RULES });
  readonly allTypes = signal<LeaveType[]>([]);
  readonly others = computed(() => this.allTypes().filter(t => t.id !== this.id));
  readonly flows: { v: ApprovalFlow; label: string; hint: string }[] = [
    { v: 'Manager', label: 'Manager approves', hint: 'Their manager, anyone above them, or HR.' },
    { v: 'ManagerThenHr', label: 'Manager, then HR', hint: 'The manager agrees first, then HR decides. HR can approve at either step.' },
    { v: 'Auto', label: 'Approved automatically', hint: 'For work from home, on duty and similar.' },
  ];
  readonly tried = signal(false); readonly saving = signal(false);
  readonly error = signal<string | null>(null); readonly loadError = signal<string | null>(null);
  readonly daysOk = computed(() => { const d = Number(this.days()); return d > 0 && d <= 365 && d * 2 === Math.round(d * 2); });

  constructor() { void this.load(); }

  private async load() {
    try {
      const [types, ets] = await Promise.all([
        firstValueFrom(this.svc.types()),
        firstValueFrom(this.settings.list<{ id: string; name: string }>('employment-types')).catch(() => []),
      ]);
      this.employmentTypes.set(ets); this.allTypes.set(types);
      if (this.id) {
        const t = types.find(x => x.id === this.id);
        if (!t) { this.loadError.set('This type no longer exists.'); return; }
        this.name.set(t.name); this.description.set(t.description ?? ''); this.color.set(t.color);
        this.unlimited.set(t.daysPerYear === null); this.days.set(t.daysPerYear ?? 12); this.accrual.set(t.accrual);
        this.carry.set(t.carryForwardMax); this.paid.set(t.isPaid); this.half.set(t.allowHalfDay);
        this.docOn.set(t.documentAfterDays !== null); this.docAfter.set(t.documentAfterDays ?? 2);
        this.active.set(t.isActive); this.chosen.set(t.employmentTypeIds); this.usedBy.set(t.usedBy);
        this.rules.set({ ...NO_RULES, ...t.rules, tenure: [...(t.rules?.tenure ?? [])], noClubWith: [...(t.rules?.noClubWith ?? [])] });
      }
    } catch (e) { this.loadError.set(errorText(e, 'Could not load this type.')); }
  }

  rv(k: keyof LeaveRules) { const v = this.rules()[k]; return v === null || v === undefined ? '' : v; }
  setNum(k: keyof LeaveRules, e: Event, empty: number | null = null) {
    const raw = (e.target as HTMLInputElement).value.trim();
    this.rules.update(r => ({ ...r, [k]: raw === '' ? empty : Number(raw) }));
  }
  setFlag(k: keyof LeaveRules, e: Event) { const v = (e.target as HTMLInputElement).checked; this.rules.update(r => ({ ...r, [k]: v })); }
  setFlow(v: ApprovalFlow) { this.rules.update(r => ({ ...r, approvalFlow: v })); }
  toggleClub(id: string) { this.rules.update(r => ({ ...r, noClubWith: r.noClubWith.includes(id) ? r.noClubWith.filter(x => x !== id) : [...r.noClubWith, id] })); }
  addTenure() { this.rules.update(r => ({ ...r, tenure: [...r.tenure, { afterYears: r.tenure.length ? r.tenure[r.tenure.length - 1].afterYears + 3 : 2, extraDays: 1 }] })); }
  removeTenure(i: number) { this.rules.update(r => ({ ...r, tenure: r.tenure.filter((_, j) => j !== i) })); }
  setTenure(i: number, k: keyof TenureStep, e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    this.rules.update(r => ({ ...r, tenure: r.tenure.map((t, j) => j === i ? { ...t, [k]: v } : t) }));
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
      rules: { ...this.rules(), tenure: this.rules().tenure.filter(t => t.afterYears > 0 && t.extraDays > 0) },
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
