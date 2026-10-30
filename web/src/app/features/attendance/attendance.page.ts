import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronLeft, LucideChevronRight, LucideUsers, LucideX, LucideFingerprintPattern, LucideSmartphone, LucideMonitor, LucideUserPen, LucideServer } from '@lucide/angular';
import { AttDay, AttMonth, AttendanceService, PunchItem, STATUS_COLOR, Today, hm } from './attendance.service';
import { CheckInCardComponent } from './check-in-card.component';
import { errorText } from '../people/people-errors';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { AuthService } from '../../core/auth/auth.service';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A month of attendance: yours (/attendance, with check-in) or someone's (/attendance/people/:id). Tap a day for its punches. */
@Component({
  standalone: true,
  imports: [RouterLink, CheckInCardComponent, SkeletonComponent, LucideArrowLeft, LucideChevronLeft, LucideChevronRight, LucideUsers, LucideX,
    LucideFingerprintPattern, LucideSmartphone, LucideMonitor, LucideUserPen, LucideServer],
  template: `
    <div class="mx-auto max-w-[820px] min-h-full pb-10">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a [routerLink]="personId ? ['/people', personId] : ['/home']" aria-label="Back" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold truncate">{{ personId ? (data()?.name ?? 'Attendance') : 'My attendance' }}</h1>
        @if (!personId && canTeam) { <a routerLink="/attendance/team" class="mr-2 h-10 px-3 flex items-center gap-1.5 rounded-full text-[14px] font-semibold text-indigo-700 hover:bg-indigo-50"><svg lucideUsers [size]="17" aria-hidden="true"></svg>Team</a> }
      </header>

      <div class="p-4 flex flex-col gap-4">
        @if (!personId && data()?.today) { <ws-check-in-card [today]="data()!.today" [shift]="data()!.shift" (changed)="punched($event)" /> }

        <div class="flex items-center gap-2">
          <button type="button" (click)="move(-1)" aria-label="Previous month" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer"><svg lucideChevronLeft [size]="20" aria-hidden="true"></svg></button>
          <h2 class="m-0 flex-1 text-center text-[17px] font-bold">{{ title() }}</h2>
          <button type="button" (click)="move(1)" [disabled]="month() >= thisMonth" aria-label="Next month" class="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 cursor-pointer disabled:opacity-40"><svg lucideChevronRight [size]="20" aria-hidden="true"></svg></button>
        </div>

        @if (loading()) { <ws-skeleton kind="cards" [rows]="4" /> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (data()) {
          @let m = data()!;
          <div class="grid grid-cols-4 gap-2">
            @for (t of tiles(); track t.label) {
              <div class="p-2.5 rounded-14 bg-white border border-slate-200 flex flex-col items-center gap-0.5 text-center">
                <span class="text-[20px] font-bold leading-none" [class]="t.cls">{{ t.value }}</span>
                <span class="text-[11px] text-slate-600 leading-tight">{{ t.label }}</span>
              </div>
            }
          </div>
          <p class="m-0 px-1 text-[12px] text-slate-500">{{ m.shift.name }} shift {{ m.shift.start }}–{{ m.shift.end }} · late after {{ m.shift.graceMinutes }} min · full day {{ m.shift.fullDayHours }} h, half day {{ m.shift.halfDayHours }} h</p>

          <div class="rounded-14 bg-white border border-slate-200 overflow-hidden">
            <div class="grid grid-cols-7 border-b border-slate-200">
              @for (h of week; track h) { <span class="py-2 text-center text-[11px] font-semibold uppercase text-slate-500">{{ h }}</span> }
            </div>
            <div class="grid grid-cols-7">
              @for (c of cells(); track $index) {
                @if (c) {
                  <button type="button" (click)="open(c)" [attr.aria-label]="aria(c)"
                          class="min-h-[64px] lg:min-h-[78px] p-1 border-0 border-b border-r border-slate-100 flex flex-col items-start gap-0.5 text-left cursor-pointer"
                          [class]="color(c).bg + (selected()?.date === c.date ? ' ring-2 ring-inset ring-indigo-500' : '')">
                    <span class="flex items-center gap-1 w-full">
                      <span class="text-[12px] font-semibold" [class]="c.date === todayIso ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center' : 'text-slate-800'">{{ dayNo(c.date) }}</span>
                      <span class="ml-auto w-2 h-2 rounded-full" [style.background]="color(c).dot" aria-hidden="true"></span>
                    </span>
                    @if (c.in) { <span class="text-[10px] lg:text-[11px] mono text-slate-700 leading-tight">{{ c.in }}{{ c.out ? '–' + c.out : '' }}</span> }
                    @else if (short(c)) { <span class="text-[10px] lg:text-[11px] leading-tight truncate w-full" [class]="color(c).text">{{ short(c) }}</span> }
                  </button>
                } @else { <span class="min-h-[64px] lg:min-h-[78px] border-b border-r border-slate-100 bg-slate-50/50"></span> }
              }
            </div>
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-1 px-1" aria-label="Legend">
            @for (k of legend; track k) { <span class="flex items-center gap-1 text-[12px] text-slate-600"><span class="w-2 h-2 rounded-full" [style.background]="colors[k].dot"></span>{{ colors[k].label }}</span> }
          </div>
        }
      </div>

      @if (selected(); as d) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="selected.set(null)">
          <section role="dialog" aria-modal="true" [attr.aria-label]="'Attendance on ' + longDate(d.date)" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[480px] max-h-[90dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-start gap-2">
              <div class="flex-1 flex flex-col gap-1">
                <h2 class="m-0 text-[19px] font-bold">{{ longDate(d.date) }}</h2>
                <span class="self-start px-2 py-0.5 rounded-full text-[12px] font-semibold" [class]="color(d).bg + ' ' + color(d).text">{{ d.label || color(d).label }}</span>
              </div>
              <button type="button" (click)="selected.set(null)" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            @if (d.in) {
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="p-2 rounded-12 bg-slate-50"><div class="text-[11px] text-slate-500">In</div><div class="text-[17px] font-bold mono">{{ d.in }}</div></div>
                <div class="p-2 rounded-12 bg-slate-50"><div class="text-[11px] text-slate-500">Out</div><div class="text-[17px] font-bold mono">{{ d.out ?? '–' }}</div></div>
                <div class="p-2 rounded-12 bg-slate-50"><div class="text-[11px] text-slate-500">Worked</div><div class="text-[17px] font-bold">{{ hours(d.workedMinutes) }}</div></div>
              </div>
            }
            @if (d.detail) { <p class="m-0 text-[14px] text-amber-800">{{ d.detail }}</p> }
            <section class="flex flex-col gap-2">
              <h3 class="m-0 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Punches</h3>
              @if (punchesLoading()) { <p class="m-0 text-[13px] text-slate-500">Loading…</p> }
              @else {
                <ul class="list-none m-0 p-0 rounded-12 border border-slate-200 overflow-hidden">
                  @for (p of punches(); track p.id) {
                    <li class="flex items-start gap-3 px-3 py-2.5 border-b border-slate-100 last:border-b-0">
                      <span class="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center" aria-hidden="true">
                        @switch (p.source) {
                          @case ('Device') { <svg lucideFingerprintPattern [size]="16"></svg> } @case ('Agent') { <svg lucideServer [size]="16"></svg> }
                          @case ('Import') { <svg lucideServer [size]="16"></svg> } @case ('Manual') { <svg lucideUserPen [size]="16"></svg> }
                          @case ('Mobile') { <svg lucideSmartphone [size]="16"></svg> } @default { <svg lucideMonitor [size]="16"></svg> }
                        }
                      </span>
                      <span class="flex-1 min-w-0 flex flex-col">
                        <span class="text-[15px] font-semibold mono">{{ p.time }}</span>
                        <span class="text-[12px] text-slate-600">{{ sourceLabel(p) }}</span>
                        @if (p.note) { <span class="text-[12px] text-slate-500">“{{ p.note }}”</span> }
                      </span>
                      @if (p.canRemove) { <button type="button" (click)="remove(p)" class="h-9 px-2 rounded-lg bg-transparent border-0 text-[13px] font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer">Remove</button> }
                    </li>
                  } @empty { <li class="px-3 py-3 text-[13px] text-slate-600">No punches.</li> }
                </ul>
              }
            </section>
            @if (data()?.canCorrect && d.status !== 'Upcoming' && d.status !== 'NotJoined') {
              <section class="flex flex-col gap-3 p-3 rounded-14 bg-slate-50 border border-slate-200">
                <h3 class="m-0 text-[14px] font-semibold">Add a missed punch</h3>
                @if (addError()) { <div class="ws-alert" role="alert">{{ addError() }}</div> }
                <div class="grid grid-cols-[110px_1fr] gap-2">
                  <label class="ws-field">Time <input class="ws-input" type="time" [value]="addTime()" (input)="addTime.set($any($event.target).value)" /></label>
                  <label class="ws-field">Why <input class="ws-input" maxlength="500" [value]="addNote()" (input)="addNote.set($any($event.target).value)" placeholder="e.g. Forgot to punch" /></label>
                </div>
                <button type="button" (click)="add(d)" [disabled]="adding() || !addTime() || !addNote().trim()" class="ws-btn ws-btn-primary !h-11">{{ adding() ? 'Adding…' : 'Add punch' }}</button>
              </section>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class AttendancePage {
  private readonly svc = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  readonly personId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly canTeam = this.auth.can('attendance.regularise') || this.auth.can('leave.approve');
  readonly week = WEEK;
  readonly colors = STATUS_COLOR;
  readonly legend = ['Present', 'Late', 'HalfDay', 'Absent', 'Missing', 'Leave', 'Holiday'];
  readonly todayIso = this.iso(new Date());
  readonly thisMonth = this.todayIso.slice(0, 7);
  readonly month = signal(this.thisMonth);
  readonly data = signal<AttMonth | null>(null);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly selected = signal<AttDay | null>(null);
  readonly punches = signal<PunchItem[]>([]); readonly punchesLoading = signal(false);
  readonly addTime = signal('09:30'); readonly addNote = signal(''); readonly adding = signal(false); readonly addError = signal<string | null>(null);

  readonly title = computed(() => { const [y, m] = this.month().split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; });
  readonly cells = computed<(AttDay | null)[]>(() => {
    const days = this.data()?.days ?? []; if (!days.length) return [];
    const first = new Date(days[0].date + 'T00:00:00Z').getUTCDay();
    return [...Array((first + 6) % 7).fill(null), ...days];
  });
  readonly tiles = computed(() => {
    const s = this.data()?.summary; if (!s) return [];
    return [
      { label: 'Present', value: String(s.present), cls: 'text-emerald-700' },
      { label: 'Late', value: String(s.late), cls: s.late ? 'text-amber-700' : 'text-slate-800' },
      { label: 'Absent', value: String(s.absent), cls: s.absent ? 'text-rose-700' : 'text-slate-800' },
      { label: 'Avg a day', value: hm(s.averageMinutes), cls: 'text-slate-800 !text-[16px]' },
    ];
  });

  constructor() { void this.load(); }

  private iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

  async load() {
    this.loading.set(true); this.error.set(null);
    try { this.data.set(await firstValueFrom(this.personId ? this.svc.employee(this.personId, this.month()) : this.svc.me(this.month()))); }
    catch (e) { this.error.set(errorText(e, 'Could not load attendance.')); }
    finally { this.loading.set(false); }
  }

  move(n: number) {
    const [y, m] = this.month().split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    this.month.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    void this.load();
  }

  punched(_: Today) { void this.load(); }

  async open(d: AttDay) {
    this.selected.set(d); this.addError.set(null); this.addNote.set('');
    this.punchesLoading.set(true);
    try { this.punches.set(await firstValueFrom(this.svc.punches(this.data()!.employeeId, d.date))); }
    catch { this.punches.set([]); }
    finally { this.punchesLoading.set(false); }
  }

  async add(d: AttDay) {
    this.adding.set(true); this.addError.set(null);
    try {
      // Times after midnight belong to the next calendar day (night shifts).
      const s = this.data()!.shift; const t = this.addTime();
      const date = s.isNight && t < s.start && t <= s.end ? this.iso(new Date(new Date(d.date + 'T12:00:00').getTime() + 86_400_000)) : d.date;
      this.punches.set(await firstValueFrom(this.svc.addPunch(this.data()!.employeeId, `${date}T${t}:00`, this.addNote().trim())));
      this.toast.show('Punch added'); this.addNote.set('');
      await this.load(); this.selected.set(this.data()?.days.find(x => x.date === d.date) ?? d);
    } catch (e) { this.addError.set(errorText(e, 'Could not add the punch.')); }
    finally { this.adding.set(false); }
  }

  async remove(p: PunchItem) {
    const d = this.selected(); if (!d) return;
    try { await firstValueFrom(this.svc.removePunch(p.id)); this.toast.show('Punch removed'); await this.load(); await this.open(this.data()?.days.find(x => x.date === d.date) ?? d); }
    catch (e) { this.toast.show(errorText(e, 'Could not remove it.'), 'error'); }
  }

  color(d: AttDay) { return STATUS_COLOR[d.status] ?? STATUS_COLOR['Upcoming']; }
  short(d: AttDay) {
    return d.status === 'Holiday' ? d.label : d.status === 'Leave' ? 'Leave' : d.status === 'Absent' ? 'Absent'
      : d.status === 'Weekend' || d.status === 'Upcoming' || d.status === 'NotJoined' || d.status === 'NoRecord' ? '' : this.color(d).label;
  }
  dayNo(iso: string) { return Number(iso.slice(8, 10)); }
  hours(m: number) { return hm(m); }
  longDate(iso: string) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }); }
  aria(d: AttDay) { return `${this.longDate(d.date)}: ${d.label || this.color(d).label}${d.in ? `, in ${d.in}` : ''}${d.out ? `, out ${d.out}` : ''}`; }
  sourceLabel(p: PunchItem) {
    switch (p.source) {
      case 'Device': return `Machine${p.deviceName ? ': ' + p.deviceName : ''}`;
      case 'Agent': return `Connector${p.deviceName ? ': ' + p.deviceName : ''}`;
      case 'Import': return 'File import';
      case 'Manual': return `Added by ${p.addedByName ?? 'HR'}`;
      case 'Mobile': return p.latitude ? 'Phone · location saved' : 'Phone';
      default: return p.latitude ? 'Web · location saved' : 'Web';
    }
  }
}
