import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronDown } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { Half, Holiday, LeaveBalance, LeavePreview, LeaveTypeOption } from './time-off.models';
import { addDays, days, fmt, num, parseDay, todayIso, weekday } from './time-off-format';
import { errorText } from '../people/people-errors';
import { ToastService } from '../../core/services/toast.service';

type DayPart = 'Full' | 'First' | 'Second';

/** Apply for time off, with a live count of working days and the balance after. HR can apply for someone (?for=id). */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideChevronDown],
  styles: [`
    .seg { height:40px; border:0; border-radius:9px; background:transparent; font:500 14px 'Geist',sans-serif; color:#334155; cursor:pointer; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgb(15 23 42 / .12); }
    .chk { display:flex; align-items:center; gap:10px; min-height:44px; font-size:15px; color:#0f172a; cursor:pointer; }
    .chk input { width:20px; height:20px; accent-color:#4f46e5; }
  `],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full pb-32">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a [routerLink]="back()" aria-label="Back" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold truncate">{{ forName() ? 'Time off for ' + forName() : 'Apply for time off' }}</h1>
      </header>

      @if (loadError()) { <div class="m-4 ws-alert" role="alert">{{ loadError() }}</div> }
      @else if (!types().length && !loading()) { <p class="m-4 text-[14px] text-slate-600">No time off types are available{{ forName() ? ' for ' + forName() : '' }}.</p> }
      @else {
        <form class="p-4 flex flex-col gap-5" (submit)="$event.preventDefault(); submit()">
          <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
            <legend class="p-0 mb-2 text-[14px] font-semibold">Type</legend>
            <div class="grid grid-cols-2 gap-2">
              @for (t of types(); track t.id) {
                <button type="button" (click)="pickType(t)" [attr.aria-pressed]="typeId() === t.id"
                        class="min-h-[64px] p-3 rounded-12 border text-left flex flex-col gap-1 cursor-pointer bg-white"
                        [class]="typeId() === t.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-300'">
                  <span class="flex items-center gap-2 text-[14px] font-semibold text-slate-900"><span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="t.color" aria-hidden="true"></span>{{ t.name }}</span>
                  <span class="text-[12px] text-slate-600">{{ left(t) }}</span>
                </button>
              }
            </div>
            @if (type()?.description) { <p class="m-0 text-[13px] text-slate-600">{{ type()!.description }}</p> }
          </fieldset>

          @if (type()?.kind === 'OptionalHoliday') {
            <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
              <legend class="p-0 mb-2 text-[14px] font-semibold">Which holiday</legend>
              <div class="flex flex-col gap-2">
                @for (h of optionalDays(); track h.id) {
                  <button type="button" (click)="setFrom(h.date); setTo(h.date)" [attr.aria-pressed]="from() === h.date"
                          class="min-h-[52px] px-4 rounded-12 border text-left flex items-center gap-3 bg-white cursor-pointer"
                          [class]="from() === h.date ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-300'">
                    <span class="w-20 text-[14px] font-semibold">{{ wd(h.date) }} {{ f(h.date) }}</span><span class="text-[15px]">{{ h.name }}</span>
                  </button>
                } @empty { <p class="m-0 text-[14px] text-slate-600">No optional holidays coming up.</p> }
              </div>
            </fieldset>
          } @else {
          <div class="grid grid-cols-2 gap-3">
            <label class="ws-field">From
              <input class="ws-input" type="date" [value]="from()" (change)="setFrom($any($event.target).value)" required />
            </label>
            <label class="ws-field">To
              <input class="ws-input" type="date" [value]="to()" [min]="from()" (change)="setTo($any($event.target).value)" required />
            </label>
          </div>

          }
          @if (type()?.allowHalfDay && type()?.kind !== 'OptionalHoliday') {
            @if (single()) {
              <div class="grid grid-cols-3 p-1 rounded-12 bg-slate-100" role="group" aria-label="How much of the day">
                @for (o of parts; track o.v) { <button type="button" class="seg" [class.seg-on]="part() === o.v" [attr.aria-pressed]="part() === o.v" (click)="part.set(o.v)">{{ o.label }}</button> }
              </div>
            } @else {
              <div class="flex flex-col">
                <label class="chk"><input type="checkbox" [checked]="startPm()" (change)="startPm.set($any($event.target).checked)" />Start after lunch on {{ wd(from()) }}</label>
                <label class="chk"><input type="checkbox" [checked]="endAm()" (change)="endAm.set($any($event.target).checked)" />Back after lunch on {{ wd(to()) }}</label>
              </div>
            }
          }

          @if (type()?.noticeDays) { <p class="m-0 -mt-2 text-[12px] text-slate-600">{{ type()!.name }} needs {{ type()!.noticeDays }} {{ type()!.noticeDays === 1 ? 'day' : 'days' }}’ notice.</p> }

          <label class="ws-field">Reason <span class="hint">{{ type()?.reasonRequired ? 'Required for ' + type()!.name + '.' : 'Optional. Your approver sees it.' }}</span>
            <textarea class="ws-input" rows="3" maxlength="1000" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="e.g. Family function in Nashik"></textarea>
          </label>

          <div class="ws-field">Supporting document <span class="hint">{{ preview()?.needsDocument ? 'Needed for this length: a doctor’s note or similar.' : 'Optional. PDF, photo, Word or Excel, up to 10 MB.' }}</span>
            <label class="flex items-center gap-3 min-h-[48px] px-3 rounded-10 border border-dashed border-slate-300 bg-white cursor-pointer font-normal text-[15px]" [class.!border-amber-400]="preview()?.needsDocument && !file()">
              <input type="file" class="sr-only" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" (change)="pickFile($event)" />
              <span class="flex-1 truncate" [class.text-slate-500]="!file()">{{ file()?.name ?? 'Choose a file' }}</span>
              @if (file()) { <button type="button" (click)="$event.preventDefault(); file.set(null)" class="h-8 px-2 bg-transparent border-0 text-[13px] font-semibold text-slate-600 cursor-pointer">Remove</button> }
            </label>
          </div>

          @if (preview(); as p) {
            <section class="p-4 rounded-14 border flex flex-col gap-3" [class]="p.error ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'" aria-live="polite">
              <div class="flex items-end gap-3">
                <span class="flex flex-col"><span class="text-[30px] font-bold leading-none">{{ n(p.days) }}</span><span class="text-[13px] text-slate-600">{{ p.days === 1 ? 'working day' : 'working days' }}</span></span>
                <span class="flex-1"></span>
                @if (!p.unlimited && p.available !== null) {
                  <span class="text-right text-[13px] text-slate-700">{{ n(p.available) }} left<br /><b [class.text-rose-700]="(p.after ?? 0) < 0">{{ n(p.after) }} after this</b></span>
                } @else if (p.unlimited) { <span class="text-[13px] text-slate-600">No limit</span> }
              </div>
              @if (p.error) { <p class="m-0 text-[14px] font-medium text-rose-800" role="alert">{{ p.error }}</p> }
              @for (note of p.notes; track note) { <p class="m-0 text-[13px] text-slate-700">{{ note }}</p> }
              @if (p.breakdown.length > 1) {
                <button type="button" (click)="showDays.set(!showDays())" class="self-start flex items-center gap-1 p-0 bg-transparent border-0 text-[13px] font-semibold text-indigo-700 cursor-pointer" [attr.aria-expanded]="showDays()">
                  Day by day <svg lucideChevronDown [size]="15" [class.rotate-180]="showDays()" aria-hidden="true"></svg>
                </button>
                @if (showDays()) {
                  <ul class="list-none m-0 p-0 flex flex-col">
                    @for (d of p.breakdown; track d.date) {
                      <li class="flex items-center gap-2 py-1.5 border-t border-slate-100 text-[13px]" [class.text-slate-500]="d.days === 0">
                        <span class="w-24">{{ wd(d.date) }} {{ f(d.date) }}</span><span class="flex-1">{{ d.name ?? d.kind }}</span><span class="mono">{{ d.days ? n(d.days) : '–' }}</span>
                      </li>
                    }
                  </ul>
                }
              }
            </section>
          } @else if (previewing()) { <p class="m-0 text-[13px] text-slate-600">Counting days…</p> }

          @if (submitError()) { <div class="ws-alert" role="alert">{{ submitError() }}</div> }

          <div class="fixed lg:static z-20 left-0 right-0 bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-auto px-4 py-3 lg:p-0 bg-white/95 lg:bg-transparent border-t border-slate-200 lg:border-0">
            <button type="submit" class="ws-btn ws-btn-primary w-full" [disabled]="!canSend()">{{ saving() ? 'Sending…' : sendLabel() }}</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class ApplyPage {
  private readonly svc = inject(TimeOffService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly forId = this.query.get('for');
  readonly optionalDays = signal<Holiday[]>([]);

  readonly parts: { v: DayPart; label: string }[] = [{ v: 'Full', label: 'Full day' }, { v: 'First', label: 'First half' }, { v: 'Second', label: 'Second half' }];
  readonly loading = signal(true); readonly loadError = signal<string | null>(null);
  readonly types = signal<LeaveTypeOption[]>([]);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly forName = signal<string | null>(null);
  readonly typeId = signal<string | null>(null);
  readonly from = signal(todayIso()); readonly to = signal(todayIso());
  readonly part = signal<DayPart>('Full'); readonly startPm = signal(false); readonly endAm = signal(false);
  readonly reason = signal('');
  readonly preview = signal<LeavePreview | null>(null); readonly previewing = signal(false);
  readonly showDays = signal(false);
  readonly saving = signal(false); readonly submitError = signal<string | null>(null);
  readonly file = signal<File | null>(null);
  pickFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    if (f && f.size > 10 * 1024 * 1024) { this.submitError.set('Files can be up to 10 MB.'); return; }
    this.file.set(f);
  }

  readonly type = computed(() => this.types().find(t => t.id === this.typeId()) ?? null);
  readonly single = computed(() => this.from() === this.to());
  readonly halves = computed<{ fromHalf: Half; toHalf: Half }>(() => {
    if (!this.type()?.allowHalfDay) return { fromHalf: null, toHalf: null };
    if (this.single()) return { fromHalf: this.part() === 'Full' ? null : this.part() as Half, toHalf: null };
    return { fromHalf: this.startPm() ? 'Second' : null, toHalf: this.endAm() ? 'First' : null };
  });
  readonly canSend = computed(() => !!this.preview() && !this.preview()!.error && !this.previewing() && !this.saving());
  readonly sendLabel = computed(() => { const p = this.preview(); return p && !p.error ? `Send request · ${days(p.days)}` : 'Send request'; });
  back() { return this.forId ? ['/people', this.forId] : ['/time-off']; }

  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.load();
    effect(() => {
      const t = this.typeId(), f = this.from(), to = this.to(), h = this.halves();
      if (!t || !f || !to) return;
      untracked(() => this.schedule(t, f, to, h));
    });
  }

  private async load() {
    try {
      const [types, bal] = await Promise.all([
        firstValueFrom(this.svc.options(this.forId)),
        this.forId ? firstValueFrom(this.svc.employee(this.forId)).then(x => { this.forName.set(x.name); return x.balances; })
                   : firstValueFrom(this.svc.me()).then(x => x.balances),
      ]);
      this.types.set(types); this.balances.set(bal);
      const wanted = this.query.get('type');
      this.typeId.set(types.find(t => t.id === wanted)?.id ?? types.find(t => t.kind === 'Regular')?.id ?? types[0]?.id ?? null);
      const date = this.query.get('date');
      const start = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : this.nextWorkingDay();
      this.from.set(start); this.to.set(start);
      if (types.some(t => t.kind === 'OptionalHoliday')) {
        const y = new Date().getFullYear(); const today = todayIso();
        const [a, b] = await Promise.all([firstValueFrom(this.svc.holidays(y, !this.forId)), firstValueFrom(this.svc.holidays(y + 1, !this.forId))]);
        this.optionalDays.set([...a, ...b].filter(h => h.isOptional && h.date >= today));
      }
    } catch (e) { this.loadError.set(errorText(e, 'Could not load time off types.')); }
    finally { this.loading.set(false); }
  }

  private nextWorkingDay(): string {
    let d = addDays(todayIso(), 1);
    for (let i = 0; i < 7 && [0, 6].includes(parseDay(d).getUTCDay()); i++) d = addDays(d, 1);
    return d;
  }

  private schedule(typeId: string, from: string, to: string, h: { fromHalf: Half; toHalf: Half }) {
    if (this.timer) clearTimeout(this.timer);
    this.previewing.set(true);
    const mine = ++this.seq;
    this.timer = setTimeout(async () => {
      try {
        const p = await firstValueFrom(this.svc.preview({ employeeId: this.forId, leaveTypeId: typeId, from, to, ...h }));
        if (mine === this.seq) this.preview.set(p);
      } catch (e) {
        if (mine === this.seq) this.preview.set({ days: 0, breakdown: [], unlimited: false, available: null, after: null, needsDocument: false, error: errorText(e, 'Could not count the days.'), notes: [] });
      } finally { if (mine === this.seq) this.previewing.set(false); }
    }, 250);
  }

  pickType(t: LeaveTypeOption) {
    this.typeId.set(t.id);
    if (t.kind === 'OptionalHoliday') {
      const first = this.optionalDays().find(h => h.date === this.from()) ?? this.optionalDays()[0];
      if (first) { this.from.set(first.date); this.to.set(first.date); }
    }
  }

  setFrom(v: string) { if (!v) return; this.from.set(v); if (this.to() < v) this.to.set(v); }
  setTo(v: string) { if (!v) return; this.to.set(v < this.from() ? this.from() : v); }

  left(t: LeaveTypeOption): string {
    if (t.unlimited) return t.isPaid ? 'No limit' : 'No limit · unpaid';
    const b = this.balances().find(x => x.leaveTypeId === t.id);
    return b ? `${num(b.available)} left` : '';
  }

  async submit() {
    if (!this.canSend()) return;
    this.saving.set(true); this.submitError.set(null);
    try {
      const r = await firstValueFrom(this.svc.apply({ employeeId: this.forId, leaveTypeId: this.typeId()!, from: this.from(), to: this.to(), ...this.halves(), reason: this.reason().trim() || null }));
      const f = this.file();
      if (f) {
        try { await firstValueFrom(this.svc.attach(r.id, f)); }
        catch (e) { this.toast.show(`Request sent, but the document didn’t upload: ${errorText(e, 'try again from Time off')}`, 'error'); void this.router.navigate(this.back()); return; }
      }
      this.toast.show(this.forId ? `Added for ${this.forName()}` : `Request sent · ${days(r.days)}`);
      void this.router.navigate(this.back());
    } catch (e) { this.submitError.set(errorText(e, 'Could not send the request.')); }
    finally { this.saving.set(false); }
  }

  n(x: number | null) { return num(x); }
  f(d: string) { return fmt(d); }
  wd(d: string) { return weekday(d); }
}
