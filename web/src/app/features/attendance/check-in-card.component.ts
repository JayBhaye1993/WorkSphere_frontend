import { Component, OnDestroy, effect, inject, input, output, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideFingerprintPattern, LucideMapPin } from '@lucide/angular';
import { AttendanceService, ShiftInfo, Today, hm } from './attendance.service';
import { ToastService } from '../../core/services/toast.service';
import { errorText } from '../people/people-errors';
import { Capacitor } from '@capacitor/core';

/** Today's check-in / check-out with a running timer. Location is added when the browser allows it. */
@Component({
  selector: 'ws-check-in-card',
  standalone: true,
  imports: [LucideFingerprintPattern, LucideMapPin],
  template: `
    <section class="p-4 rounded-[18px] bg-white border border-slate-200 flex items-center gap-4" aria-label="Attendance today">
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <span class="text-[13px] text-slate-600">{{ dateLabel }}</span>
        <span class="text-[28px] font-bold leading-none mono">{{ clock() }}</span>
        <span class="text-[13px] text-slate-700">
          @if (state(); as t) {
            @if (t.checkedIn) { In since <b>{{ t.since }}</b> · {{ worked() }} today }
            @else if (t.punches > 0) { Out at <b>{{ t.lastPunch }}</b> · {{ worked() }} today }
            @else { Not checked in yet }
          } @else { Loading… }
        </span>
        @if (shift(); as s) { <span class="text-[12px] text-slate-500">{{ s.name }} shift · {{ s.start }}–{{ s.end }}</span> }
      </div>
      <button type="button" (click)="punch()" [disabled]="busy() || !state()"
              class="w-[92px] h-[92px] shrink-0 rounded-full border-0 flex flex-col items-center justify-center gap-1 text-white font-semibold text-[14px] cursor-pointer shadow-md transition-transform active:scale-95 disabled:opacity-60"
              [class]="state()?.checkedIn ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'">
        <svg lucideFingerprintPattern [size]="28" aria-hidden="true"></svg>
        {{ busy() ? '…' : (state()?.nextAction ?? 'Check in') }}
      </button>
    </section>
  `,
})
export class CheckInCardComponent implements OnDestroy {
  private readonly svc = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  readonly today = input<Today | null>(null);
  readonly shift = input<ShiftInfo | null>(null);
  readonly changed = output<Today>();
  readonly state = signal<Today | null>(null);
  readonly busy = signal(false);
  readonly clock = signal(this.now());
  readonly worked = signal('0h');
  readonly dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  private base = 0; private baseAt = Date.now();
  private timer = setInterval(() => this.tick(), 15_000);

  constructor() {
    effect(() => { const t = this.today(); untracked(() => { if (t) this.set(t); }); });
  }
  ngOnDestroy() { clearInterval(this.timer); }

  private now() { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  private set(t: Today) { this.state.set(t); this.base = t.workedMinutes; this.baseAt = Date.now(); this.tick(); }
  private tick() {
    this.clock.set(this.now());
    const t = this.state(); if (!t) return;
    const extra = t.checkedIn ? Math.floor((Date.now() - this.baseAt) / 60000) : 0;
    this.worked.set(hm(this.base + extra));
  }

  private location(): Promise<{ lat: number; lng: number } | null> {
    if (!('geolocation' in navigator)) return Promise.resolve(null);
    return new Promise(resolve => {
      const done = setTimeout(() => resolve(null), 6000);
      navigator.geolocation.getCurrentPosition(
        p => { clearTimeout(done); resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }); },
        () => { clearTimeout(done); resolve(null); }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 });
    });
  }

  async punch() {
    this.busy.set(true);
    try {
      const loc = await this.location();
      const source = Capacitor.isNativePlatform() || window.matchMedia('(max-width: 767px)').matches ? 'Mobile' : 'Web';
      const t = await firstValueFrom(this.svc.punch(source, loc?.lat ?? null, loc?.lng ?? null));
      this.set(t); this.changed.emit(t);
      this.toast.show(t.checkedIn ? `Checked in at ${t.lastPunch}` : `Checked out at ${t.lastPunch}`);
    } catch (e) { this.toast.show(errorText(e, 'Could not record your punch.'), 'error'); }
    finally { this.busy.set(false); }
  }
}
