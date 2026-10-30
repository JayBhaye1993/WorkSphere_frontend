import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft } from '@lucide/angular';
import { AttRules, AttRulesInput, AttendanceService } from '../attendance.service';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonComponent } from '../../../shared/skeleton.component';

/** Settings › Attendance rules: corrections, work from home, overtime to comp-off and reminders. */
@Component({
  standalone: true,
  imports: [RouterLink, SkeletonComponent, LucideArrowLeft],
  styles: [`
    .row { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
    .row:last-child { border-bottom: 0; }
    .num { width: 84px; height: 40px; text-align: center; }
  `],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full pb-28">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Attendance rules</h1>
      </header>
      <div class="p-4 flex flex-col gap-5">
        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @if (!f()) { <ws-skeleton kind="form" [rows]="6" /> } @else {
          @let r = f()!;
          <section class="flex flex-col gap-2">
            <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Corrections</h2>
            <p class="m-0 px-1 text-[13px] text-slate-600">People ask their manager to fix a day: a missed punch, or the machine didn’t read them.</p>
            <div class="bg-white border border-slate-200 rounded-14">
              <label class="row"><span class="flex-1 text-[15px]">How many days back</span>
                <input class="ws-input num" type="number" min="0" max="90" [value]="r.correctionDaysBack" (input)="set({ correctionDaysBack: num($event) ?? 0 })" /></label>
              <label class="row"><span class="flex-1 flex flex-col"><span class="text-[15px]">Most a month, per person</span><span class="text-[12px] text-slate-600">Empty for no limit</span></span>
                <input class="ws-input num" type="number" min="0" max="31" [value]="r.correctionsPerMonth ?? ''" (input)="set({ correctionsPerMonth: num($event) })" /></label>
            </div>
          </section>

          <section class="flex flex-col gap-2">
            <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Work from home</h2>
            <div class="bg-white border border-slate-200 rounded-14">
              <label class="row cursor-pointer"><span class="flex-1 text-[15px]">People can ask to work from home</span>
                <input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="r.wfhEnabled" (change)="set({ wfhEnabled: $any($event.target).checked })" /></label>
              @if (r.wfhEnabled) {
                <label class="row cursor-pointer"><span class="flex-1 flex flex-col"><span class="text-[15px]">They still check in from the app</span><span class="text-[12px] text-slate-600">{{ r.wfhNeedsCheckIn ? 'An approved day without a check-in shows as absent.' : 'An approved day counts as present, check-in or not.' }}</span></span>
                  <input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="r.wfhNeedsCheckIn" (change)="set({ wfhNeedsCheckIn: $any($event.target).checked })" /></label>
                <label class="row"><span class="flex-1 flex flex-col"><span class="text-[15px]">Most days a month, per person</span><span class="text-[12px] text-slate-600">Empty for no limit</span></span>
                  <input class="ws-input num" type="number" min="1" max="31" [value]="r.wfhDaysPerMonth ?? ''" (input)="set({ wfhDaysPerMonth: num($event) })" /></label>
              }
            </div>
          </section>

          <section class="flex flex-col gap-2">
            <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Overtime</h2>
            <div class="bg-white border border-slate-200 rounded-14">
              <label class="row cursor-pointer" [class.opacity-60]="!rules()?.compOffAvailable"><span class="flex-1 flex flex-col"><span class="text-[15px]">Weekend and holiday work becomes comp-off</span>
                <span class="text-[12px] text-slate-600">{{ rules()?.compOffAvailable ? 'Half a shift or more raises a half or full day comp-off request for the manager. Checked every night.' : 'Switch on the Comp Off time off type first.' }}</span></span>
                <input type="checkbox" class="w-5 h-5 accent-indigo-600" [disabled]="!rules()?.compOffAvailable" [checked]="r.overtimeToCompOff" (change)="set({ overtimeToCompOff: $any($event.target).checked })" /></label>
              @if (rules()?.compOffAvailable && r.overtimeToCompOff) {
                <div class="row"><span class="flex-1 text-[13px] text-slate-600">Run the check now for the last two weeks</span>
                  <button type="button" (click)="scan()" [disabled]="scanning()" class="ws-btn ws-btn-ghost !h-10">{{ scanning() ? 'Checking…' : 'Check now' }}</button></div>
              }
            </div>
          </section>

          <section class="flex flex-col gap-2">
            <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Reminders</h2>
            <p class="m-0 px-1 text-[13px] text-slate-600">Sent in the app (and by email if the person wants). Not on leave, holidays or weekends.</p>
            <div class="bg-white border border-slate-200 rounded-14">
              <label class="row cursor-pointer"><span class="flex-1 text-[15px]">Remind people who haven’t checked in</span>
                <input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="r.remindCheckIn" (change)="set({ remindCheckIn: $any($event.target).checked })" /></label>
              @if (r.remindCheckIn) {
                <label class="row"><span class="flex-1 text-[15px]">Minutes after the shift starts</span>
                  <input class="ws-input num" type="number" min="0" max="240" [value]="r.checkInReminderMinutes" (input)="set({ checkInReminderMinutes: num($event) ?? 0 })" /></label>
              }
              <label class="row cursor-pointer"><span class="flex-1 text-[15px]">Remind people who forgot to check out</span>
                <input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="r.remindCheckOut" (change)="set({ remindCheckOut: $any($event.target).checked })" /></label>
              @if (r.remindCheckOut) {
                <label class="row"><span class="flex-1 text-[15px]">Minutes after the shift ends</span>
                  <input class="ws-input num" type="number" min="0" max="480" [value]="r.checkOutReminderMinutes" (input)="set({ checkOutReminderMinutes: num($event) ?? 0 })" /></label>
              }
            </div>
          </section>
        }
      </div>
      @if (dirty()) {
        <div class="fixed z-20 left-0 right-0 bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-4 px-4 py-3 lg:px-0 bg-white/95 lg:bg-transparent border-t border-slate-200 lg:border-0 flex justify-center gap-2">
          <button type="button" (click)="reset()" [disabled]="saving()" class="ws-btn ws-btn-ghost lg:shadow">Undo</button>
          <button type="button" (click)="save()" [disabled]="saving()" class="ws-btn ws-btn-primary flex-1 lg:flex-none lg:shadow-lg">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
        </div>
      }
    </div>
  `,
})
export class AttendanceRulesPage {
  private readonly svc = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  readonly rules = signal<AttRules | null>(null);
  readonly f = signal<AttRulesInput | null>(null);
  readonly dirty = signal(false); readonly saving = signal(false); readonly scanning = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    firstValueFrom(this.svc.rules()).then(r => { this.rules.set(r); this.reset(); }).catch(e => this.error.set(errorText(e, 'Could not load the rules.')));
  }
  reset() {
    const r = this.rules(); if (!r) return;
    const { compOffAvailable, canManage, ...input } = r;
    this.f.set(input); this.dirty.set(false); this.error.set(null);
  }
  num(e: Event): number | null { const v = ($any(e.target) as HTMLInputElement).value; return v === '' ? null : Math.round(Number(v)); }
  set(p: Partial<AttRulesInput>) { this.f.update(x => x ? { ...x, ...p } : x); this.dirty.set(true); }
  async save() {
    const f = this.f(); if (!f) return;
    this.saving.set(true); this.error.set(null);
    try { this.rules.set(await firstValueFrom(this.svc.saveRules(f))); this.reset(); this.toast.show('Saved'); }
    catch (e) { this.error.set(errorText(e, 'Could not save.')); }
    finally { this.saving.set(false); }
  }
  async scan() {
    this.scanning.set(true);
    try { const r = await firstValueFrom(this.svc.scanOvertime(14)); this.toast.show(r.raised ? `${r.raised} comp-off request${r.raised === 1 ? '' : 's'} sent to managers` : 'Nothing new found'); }
    catch (e) { this.toast.show(errorText(e, 'Could not run the check.'), 'error'); }
    finally { this.scanning.set(false); }
  }
}
function $any(x: unknown): any { return x; }
