import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft } from '@lucide/angular';
import { TimeOffService } from './time-off.service';
import { CompOffClaim } from './time-off.models';
import { addDays, fmt, parseDay, todayIso, weekday } from './time-off-format';
import { errorText } from '../people/people-errors';
import { ToastService } from '../../core/services/toast.service';

/** Claim comp-off for a weekend or holiday you worked, and see your claims. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft],
  styles: [`
    .seg { height:40px; border:0; border-radius:9px; background:transparent; font:500 14px 'Geist',sans-serif; color:#334155; cursor:pointer; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgb(15 23 42 / .12); }
  `],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full pb-10">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/time-off" aria-label="Back to time off" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Comp-off</h1>
      </header>
      <div class="p-4 flex flex-col gap-5">
        <form class="ws-card" (submit)="$event.preventDefault(); claim()">
          <h2 class="ws-card-h">Claim a day you worked</h2>
          <p class="m-0 text-[13px] text-slate-600">Worked on a weekend or holiday? Claim it here. Once your manager approves, you can take it as Comp Off before it expires.</p>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Recent weekend days">
            @for (d of recent(); track d) { <button type="button" class="ws-pill" [attr.aria-pressed]="date() === d" (click)="date.set(d)">{{ wd(d) }} {{ f(d) }}</button> }
          </div>
          <label class="ws-field">Day you worked <input class="ws-input" type="date" [max]="today" [value]="date()" (change)="date.set($any($event.target).value)" /></label>
          <div class="grid grid-cols-2 p-1 rounded-12 bg-slate-100" role="group" aria-label="How long">
            <button type="button" class="seg" [class.seg-on]="days() === 1" [attr.aria-pressed]="days() === 1" (click)="days.set(1)">Full day</button>
            <button type="button" class="seg" [class.seg-on]="days() === 0.5" [attr.aria-pressed]="days() === 0.5" (click)="days.set(0.5)">Half day</button>
          </div>
          <label class="ws-field">What did you work on? <textarea class="ws-input" rows="2" maxlength="500" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="e.g. Production release for Acme"></textarea></label>
          @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
          <button type="submit" class="ws-btn ws-btn-primary" [disabled]="saving() || !date() || !reason().trim()">{{ saving() ? 'Sending…' : 'Send claim' }}</button>
        </form>

        <section class="flex flex-col gap-2">
          <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Your claims</h2>
          <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
            @for (c of claims(); track c.id) {
              <li class="flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
                <span class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span class="text-[15px] font-semibold">{{ c.workedLabel }} · {{ c.days === 1 ? 'full day' : 'half day' }}</span>
                  <span class="text-[13px] text-slate-600">{{ c.reason }}</span>
                  @if (c.status === 'Approved' && c.expiresOn) { <span class="text-[12px] text-slate-500">Approved by {{ c.decidedByName }} · use by {{ f(c.expiresOn, true) }}</span> }
                  @if (c.status === 'Rejected') { <span class="text-[12px] text-rose-800">“{{ c.decisionNote }}” – {{ c.decidedByName }}</span> }
                </span>
                <span class="flex flex-col items-end gap-1.5 shrink-0">
                  <span class="px-2 py-0.5 rounded-full border text-[12px] font-semibold" [class]="pill(c)">{{ c.status === 'Rejected' ? 'Declined' : c.status }}</span>
                  @if (c.canCancel) { <button type="button" (click)="cancel(c)" class="h-9 px-2 -mr-2 rounded-lg bg-transparent border-0 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">Withdraw</button> }
                </span>
              </li>
            } @empty { <li class="px-4 py-4 text-[14px] text-slate-600">{{ loading() ? 'Loading…' : 'No claims yet.' }}</li> }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class CompOffPage {
  private readonly svc = inject(TimeOffService);
  private readonly toast = inject(ToastService);
  readonly today = todayIso();
  /** The last two weekends, newest first, as quick picks. */
  readonly recent = computed(() => {
    const out: string[] = [];
    for (let i = 0; i < 16 && out.length < 4; i++) { const d = addDays(this.today, -i); if ([0, 6].includes(parseDay(d).getUTCDay())) out.push(d); }
    return out;
  });
  readonly date = signal(this.recent()[0] ?? this.today);
  readonly days = signal<1 | 0.5>(1);
  readonly reason = signal('');
  readonly claims = signal<CompOffClaim[]>([]);
  readonly loading = signal(true); readonly saving = signal(false); readonly error = signal<string | null>(null);

  constructor() { void this.load(); }
  async load() {
    try { this.claims.set(await firstValueFrom(this.svc.myCompOff())); }
    catch (e) { this.error.set(errorText(e, 'Could not load your claims.')); }
    finally { this.loading.set(false); }
  }
  async claim() {
    this.saving.set(true); this.error.set(null);
    try {
      await firstValueFrom(this.svc.claimCompOff({ workedDate: this.date(), days: this.days(), reason: this.reason().trim() }));
      this.toast.show('Claim sent to your manager'); this.reason.set(''); await this.load();
    } catch (e) { this.error.set(errorText(e, 'Could not send the claim.')); }
    finally { this.saving.set(false); }
  }
  async cancel(c: CompOffClaim) {
    try { await firstValueFrom(this.svc.cancelCompOff(c.id)); this.toast.show('Claim withdrawn'); await this.load(); }
    catch (e) { this.toast.show(errorText(e, 'Could not withdraw.'), 'error'); }
  }
  pill(c: CompOffClaim) {
    return { Pending: 'bg-amber-50 text-amber-800 border-amber-200', Approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Rejected: 'bg-rose-50 text-rose-800 border-rose-200', Cancelled: 'bg-slate-100 text-slate-600 border-slate-200' }[c.status];
  }
  wd(d: string) { return weekday(d); }
  f(d: string, y = false) { return fmt(d, y); }
}
