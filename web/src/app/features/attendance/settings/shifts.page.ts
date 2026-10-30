import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight, LucidePlus, LucideX, LucideMoon } from '@lucide/angular';
import { Assignment, AttendanceService, PersonId, Shift, ShiftInput } from '../attendance.service';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsService } from '../../settings/settings.service';
import { SkeletonComponent } from '../../../shared/skeleton.component';

interface Draft extends ShiftInput { id: string | null; isDefault: boolean; }
const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#64748b'];

/** Settings › Shifts: working hours, when someone is late, what counts as a full or half day, and who works which shift. */
@Component({
  standalone: true,
  imports: [RouterLink, SkeletonComponent, LucideArrowLeft, LucideChevronRight, LucidePlus, LucideX, LucideMoon],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Shifts</h1>
        <button type="button" (click)="open(null)" aria-label="Add a shift" class="w-11 h-11 mr-1 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 text-indigo-700 cursor-pointer"><svg lucidePlus [size]="22" aria-hidden="true"></svg></button>
      </header>
      <div class="p-4 flex flex-col gap-5">
        <p class="m-0 px-1 text-[13px] text-slate-600">A person works their own shift if they have one, otherwise their location’s, otherwise the default. A shift that ends after midnight is a night shift: the whole night counts as the day it started.</p>
        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @if (loading()) { <ws-skeleton kind="list" [rows]="3" /> } @else {
          <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
            @for (s of shifts(); track s.id) {
              <li class="border-b border-slate-100 last:border-b-0">
                <button type="button" (click)="open(s)" class="w-full flex items-center gap-3 min-h-[64px] px-4 py-2 bg-transparent border-0 text-left cursor-pointer hover:bg-slate-50" [class.opacity-60]="!s.isActive">
                  <span class="w-3 h-10 rounded-full shrink-0" [style.background]="s.color" aria-hidden="true"></span>
                  <span class="flex-1 min-w-0 flex flex-col">
                    <span class="flex items-center gap-2 text-[15px] font-semibold text-slate-900">{{ s.name }}
                      @if (s.isNight) { <svg lucideMoon [size]="14" class="text-indigo-600" aria-label="Night shift"></svg> }
                      @if (s.isDefault) { <span class="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold">Default</span> }
                      @if (!s.isActive) { <span class="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">Off</span> }
                    </span>
                    <span class="text-[12px] text-slate-600"><span class="mono">{{ s.start }}–{{ s.end }}</span> · late after {{ s.graceMinutes }} min · {{ s.fullDayHours }} h full, {{ s.halfDayHours }} h half</span>
                    <span class="text-[12px] text-slate-500">{{ usedBy(s) }}</span>
                  </span>
                  <svg lucideChevronRight [size]="16" class="text-slate-400" aria-hidden="true"></svg>
                </button>
              </li>
            }
          </ul>

          @if (locations().length) {
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Shift for each location</h2>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (l of locations(); track l.id) {
                  <li class="flex items-center gap-3 min-h-[56px] px-4 py-2 border-b border-slate-100 last:border-b-0">
                    <span class="flex-1 text-[15px] font-medium">{{ l.name }}</span>
                    <select class="ws-input !w-auto !h-10 max-w-[55%]" [attr.aria-label]="'Shift for ' + l.name" [value]="assigned('Location', l.id) ?? ''" (change)="assign('Location', l.id, $any($event.target).value)">
                      <option value="">Default ({{ defaultName() }})</option>
                      @for (s of activeShifts(); track s.id) { <option [value]="s.id" [selected]="assigned('Location', l.id) === s.id">{{ s.name }}</option> }
                    </select>
                  </li>
                }
              </ul>
            </section>
          }

          <section class="flex flex-col gap-2">
            <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">People with their own shift</h2>
            <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
              @for (a of personal(); track a.targetId) {
                <li class="flex items-center gap-3 min-h-[56px] px-4 py-2 border-b border-slate-100 last:border-b-0">
                  <span class="flex-1 min-w-0 flex flex-col"><span class="text-[15px] font-medium truncate">{{ personName(a.targetId) }}</span><span class="text-[12px] text-slate-600">{{ shiftName(a.shiftId) }}</span></span>
                  <button type="button" (click)="assign('Employee', a.targetId, '')" class="h-9 px-3 rounded-lg bg-transparent border-0 text-[13px] font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer">Remove</button>
                </li>
              } @empty { <li class="px-4 py-4 text-[14px] text-slate-600">Nobody yet.</li> }
            </ul>
            <div class="flex flex-col lg:flex-row gap-2 p-3 rounded-14 bg-slate-50 border border-slate-200">
              <label class="ws-field flex-1">Person
                <select class="ws-input" [value]="pickPerson()" (change)="pickPerson.set($any($event.target).value)">
                  <option value="">Choose…</option>
                  @for (p of people(); track p.employeeId) { <option [value]="p.employeeId">{{ p.name }}{{ p.employeeCode ? ' · ' + p.employeeCode : '' }}</option> }
                </select>
              </label>
              <label class="ws-field flex-1">Shift
                <select class="ws-input" [value]="pickShift()" (change)="pickShift.set($any($event.target).value)">
                  <option value="">Choose…</option>
                  @for (s of activeShifts(); track s.id) { <option [value]="s.id">{{ s.name }} ({{ s.start }}–{{ s.end }})</option> }
                </select>
              </label>
              <button type="button" (click)="givePersonal()" [disabled]="!pickPerson() || !pickShift()" class="ws-btn ws-btn-primary lg:self-end">Give shift</button>
            </div>
          </section>
        }
      </div>

      @if (draft(); as d) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="draft.set(null)">
          <section role="dialog" aria-modal="true" [attr.aria-label]="d.id ? 'Edit shift' : 'Add shift'" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[520px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <h2 class="m-0 flex-1 text-[19px] font-bold">{{ d.id ? 'Edit shift' : 'Add shift' }}</h2>
              <button type="button" (click)="draft.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }
            <label class="ws-field">Name <input class="ws-input" [value]="d.name" (input)="patch({ name: $any($event.target).value })" maxlength="100" placeholder="e.g. Morning" /></label>
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">Starts <input class="ws-input" type="time" [value]="d.start" (change)="patch({ start: $any($event.target).value })" /></label>
              <label class="ws-field">Ends <input class="ws-input" type="time" [value]="d.end" (change)="patch({ end: $any($event.target).value })" /></label>
            </div>
            @if (d.end && d.start && d.end < d.start) { <p class="m-0 -mt-2 text-[12px] text-indigo-700 flex items-center gap-1"><svg lucideMoon [size]="13" aria-hidden="true"></svg>Night shift: ends the next morning.</p> }
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">Late after (minutes) <input class="ws-input" type="number" min="0" max="240" [value]="d.graceMinutes" (input)="patch({ graceMinutes: +$any($event.target).value })" /></label>
              <label class="ws-field">Break (minutes) <input class="ws-input" type="number" min="0" max="240" [value]="d.breakMinutes" (input)="patch({ breakMinutes: +$any($event.target).value })" /></label>
              <label class="ws-field">Full day (hours) <input class="ws-input" type="number" min="1" max="24" step="0.5" [value]="d.fullDayHours" (input)="patch({ fullDayHours: +$any($event.target).value })" /></label>
              <label class="ws-field">Half day (hours) <input class="ws-input" type="number" min="0.5" max="24" step="0.5" [value]="d.halfDayHours" (input)="patch({ halfDayHours: +$any($event.target).value })" /></label>
            </div>
            <p class="m-0 -mt-2 text-[12px] text-slate-600">Hours are from first check-in to last check-out. Less than half a day counts as absent.</p>
            <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
              <legend class="p-0 mb-1 text-[14px] font-semibold">Colour</legend>
              <div class="flex gap-2">
                @for (c of colors; track c) { <button type="button" (click)="patch({ color: c })" [attr.aria-label]="'Colour ' + c" [attr.aria-pressed]="d.color === c" class="w-9 h-9 rounded-full border-2 cursor-pointer" [style.background]="c" [class]="d.color === c ? 'border-slate-900' : 'border-white'"></button> }
              </div>
            </fieldset>
            @if (!d.isDefault) { <label class="flex items-center gap-3 min-h-[44px] text-[15px]"><input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="d.isActive" (change)="patch({ isActive: $any($event.target).checked })" />In use</label> }
            <div class="flex flex-wrap gap-2">
              @if (d.id && !d.isDefault) {
                <button type="button" (click)="remove(d)" [disabled]="saving()" class="ws-btn ws-btn-ghost !text-rose-700">Delete</button>
                <button type="button" (click)="makeDefault(d)" [disabled]="saving() || !d.isActive" class="ws-btn ws-btn-ghost">Make default</button>
              }
              <button type="button" (click)="save(d)" [disabled]="saving() || !d.name.trim() || !d.start || !d.end" class="ws-btn ws-btn-primary flex-1">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class ShiftsPage {
  private readonly svc = inject(AttendanceService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  readonly colors = COLORS;
  readonly shifts = signal<Shift[]>([]);
  readonly assignments = signal<Assignment[]>([]);
  readonly locations = signal<{ id: string; name: string }[]>([]);
  readonly people = signal<PersonId[]>([]);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly draft = signal<Draft | null>(null);
  readonly saving = signal(false); readonly sheetError = signal<string | null>(null);
  readonly pickPerson = signal(''); readonly pickShift = signal('');
  readonly activeShifts = computed(() => this.shifts().filter(s => s.isActive));
  readonly defaultName = computed(() => this.shifts().find(s => s.isDefault)?.name ?? '');
  readonly personal = computed(() => this.assignments().filter(a => a.targetType === 'Employee'));
  private readonly names = computed(() => new Map(this.people().map(p => [p.employeeId, p.name])));

  constructor() {
    void this.load();
    firstValueFrom(this.settings.list<{ id: string; name: string }>('locations')).then(x => this.locations.set(x)).catch(() => {});
    firstValueFrom(this.svc.ids()).then(x => this.people.set(x.filter(p => p.isActive))).catch(() => {});
  }
  async load() {
    this.loading.set(this.shifts().length === 0); this.error.set(null);
    try {
      const [s, a] = await Promise.all([firstValueFrom(this.svc.shifts()), firstValueFrom(this.svc.assignments())]);
      this.shifts.set(s); this.assignments.set(a);
    } catch (e) { this.error.set(errorText(e, 'Could not load shifts.')); }
    finally { this.loading.set(false); }
  }
  usedBy(s: Shift) {
    const parts = [s.locations ? `${s.locations} location${s.locations > 1 ? 's' : ''}` : '', s.people ? `${s.people} ${s.people > 1 ? 'people' : 'person'}` : ''].filter(Boolean);
    return parts.length ? 'Used by ' + parts.join(' · ') : s.isDefault ? 'Everyone else' : 'Not used yet';
  }
  assigned(t: 'Location' | 'Employee', id: string) { return this.assignments().find(a => a.targetType === t && a.targetId === id)?.shiftId ?? null; }
  personName(id: string) { return this.names().get(id) ?? 'Someone'; }
  shiftName(id: string) { const s = this.shifts().find(x => x.id === id); return s ? `${s.name} · ${s.start}–${s.end}` : ''; }

  async assign(t: 'Location' | 'Employee', id: string, shiftId: string) {
    try { await firstValueFrom(this.svc.assign(t, id, shiftId || null)); this.toast.show(shiftId ? 'Shift set' : 'Back to the usual shift'); await this.load(); }
    catch (e) { this.toast.show(errorText(e, 'Could not change the shift.'), 'error'); }
  }
  async givePersonal() { await this.assign('Employee', this.pickPerson(), this.pickShift()); this.pickPerson.set(''); this.pickShift.set(''); }

  open(s: Shift | null) {
    this.sheetError.set(null);
    this.draft.set(s ? { id: s.id, name: s.name, start: s.start, end: s.end, graceMinutes: s.graceMinutes, fullDayHours: s.fullDayHours, halfDayHours: s.halfDayHours, breakMinutes: s.breakMinutes, isActive: s.isActive, color: s.color, isDefault: s.isDefault }
                     : { id: null, name: '', start: '09:30', end: '18:30', graceMinutes: 15, fullDayHours: 8, halfDayHours: 4, breakMinutes: 60, isActive: true, color: COLORS[this.shifts().length % COLORS.length], isDefault: false });
  }
  patch(p: Partial<Draft>) { this.draft.update(d => d ? { ...d, ...p } : d); }
  async save(d: Draft) {
    this.saving.set(true); this.sheetError.set(null);
    const { id, isDefault, ...body } = d; body.name = body.name.trim();
    try { await firstValueFrom(id ? this.svc.updateShift(id, body) : this.svc.createShift(body)); this.draft.set(null); this.toast.show('Saved'); await this.load(); }
    catch (e) { this.sheetError.set(errorText(e, 'Could not save the shift.')); }
    finally { this.saving.set(false); }
  }
  async makeDefault(d: Draft) {
    if (!d.id) return; this.saving.set(true);
    try { await firstValueFrom(this.svc.makeDefault(d.id)); this.draft.set(null); this.toast.show(`${d.name} is now the default`); await this.load(); }
    catch (e) { this.sheetError.set(errorText(e, 'Could not change the default.')); }
    finally { this.saving.set(false); }
  }
  async remove(d: Draft) {
    if (!d.id) return; this.saving.set(true);
    try { await firstValueFrom(this.svc.deleteShift(d.id)); this.draft.set(null); this.toast.show('Deleted'); await this.load(); }
    catch (e) { this.sheetError.set(errorText(e, 'Could not delete.')); }
    finally { this.saving.set(false); }
  }
}
