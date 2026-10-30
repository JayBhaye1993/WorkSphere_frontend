import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideCalendarCheck, LucidePalmtree, LucideSquareKanban, LucideInbox, LucideUsers, LucideSun, LucideChevronRight } from '@lucide/angular';
import { AttMonth, AttendanceService, Today, hm } from '../attendance/attendance.service';
import { CheckInCardComponent } from '../attendance/check-in-card.component';
import { TimeOffService } from '../time-off/time-off.service';
import { AuthService } from '../../core/auth/auth.service';
import { BellComponent } from '../notifications/bell.component';
import { SkeletonComponent } from '../../shared/skeleton.component';

/** Home: check in or out, how this month is going, and the things people open most. */
@Component({
  standalone: true,
  imports: [RouterLink, CheckInCardComponent, BellComponent, SkeletonComponent, LucideCalendarCheck, LucidePalmtree, LucideSquareKanban, LucideInbox, LucideUsers, LucideSun, LucideChevronRight],
  template: `
    <div class="mx-auto max-w-[820px] min-h-full pb-10">
      <header class="px-4 pt-5 pb-1 flex items-start gap-2">
        <div class="flex-1 flex flex-col gap-0.5">
          <span class="text-[13px] text-slate-600">{{ dateLine }}</span>
          <h1 class="m-0 text-[24px] font-bold leading-tight">{{ greeting }}, {{ firstName() }}</h1>
        </div>
        <ws-bell class="lg:hidden" />
      </header>
      <div class="p-4 flex flex-col gap-4">
        @if (loading()) { <ws-skeleton kind="cards" [rows]="2" /> }
        @else if (month()) {
          @let m = month()!;
          @if (m.today) { <ws-check-in-card [today]="m.today" [shift]="m.shift" (changed)="punched($event)" /> }
          <a routerLink="/attendance" class="flex items-center gap-3 p-4 rounded-14 bg-white border border-slate-200 no-underline text-slate-900 hover:border-slate-300">
            <span class="flex-1 flex flex-col gap-1">
              <span class="text-[13px] font-semibold text-slate-600">This month</span>
              <span class="flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                <span><b class="text-emerald-700">{{ m.summary.present }}</b> present</span>
                @if (m.summary.late) { <span><b class="text-amber-700">{{ m.summary.late }}</b> late</span> }
                @if (m.summary.absent) { <span><b class="text-rose-700">{{ m.summary.absent }}</b> absent</span> }
                @if (m.summary.missing) { <span><b class="text-orange-700">{{ m.summary.missing }}</b> missing punch</span> }
                <span class="text-slate-600">avg {{ avg() }} a day</span>
              </span>
            </span>
            <svg lucideChevronRight [size]="18" class="text-slate-400" aria-hidden="true"></svg>
          </a>
        } @else if (failed()) {
          <p class="m-0 p-4 rounded-14 bg-white border border-slate-200 text-[14px] text-slate-600">Attendance isn’t available for your login (it needs an employee profile).</p>
        }

        <section class="grid grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Shortcuts">
          @for (l of links(); track l.link) {
            <a [routerLink]="l.link" class="relative flex flex-col gap-2 p-4 min-h-[96px] rounded-14 bg-white border border-slate-200 no-underline text-slate-900 hover:border-indigo-300">
              <span class="w-9 h-9 rounded-full flex items-center justify-center" [class]="l.tone" aria-hidden="true">
                @switch (l.icon) {
                  @case ('att') { <svg lucideCalendarCheck [size]="18"></svg> } @case ('leave') { <svg lucidePalmtree [size]="18"></svg> }
                  @case ('tasks') { <svg lucideSquareKanban [size]="18"></svg> } @case ('approvals') { <svg lucideInbox [size]="18"></svg> }
                  @case ('team') { <svg lucideUsers [size]="18"></svg> } @default { <svg lucideSun [size]="18"></svg> }
                }
              </span>
              <span class="text-[14px] font-semibold leading-tight">{{ l.name }}</span>
              @if (l.badge) { <span class="absolute top-3 right-3 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white text-[12px] font-bold flex items-center justify-center">{{ l.badge }}</span> }
            </a>
          }
        </section>
      </div>
    </div>
  `,
})
export class HomePage {
  private readonly att = inject(AttendanceService);
  private readonly timeOff = inject(TimeOffService);
  private readonly auth = inject(AuthService);
  readonly month = signal<AttMonth | null>(null);
  readonly loading = signal(true); readonly failed = signal(false);
  readonly approvals = signal(0);
  readonly firstName = computed(() => (this.auth.user()?.fullName ?? '').split(' ')[0] || 'there');
  readonly greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
  readonly dateLine = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  private readonly canApprove = this.auth.can('leave.approve');
  private readonly canTeam = this.auth.can('attendance.regularise') || this.canApprove;
  readonly avg = computed(() => hm(this.month()?.summary.averageMinutes ?? 0));
  readonly links = computed(() => [
    { name: 'My attendance', link: '/attendance', icon: 'att', tone: 'bg-indigo-50 text-indigo-700', badge: 0 },
    { name: 'Apply for time off', link: '/time-off/apply', icon: 'leave', tone: 'bg-violet-50 text-violet-700', badge: 0 },
    { name: 'My tasks', link: '/tasks', icon: 'tasks', tone: 'bg-sky-50 text-sky-700', badge: 0 },
    ...(this.canApprove || this.canTeam ? [{ name: 'Approvals', link: '/time-off/approvals', icon: 'approvals', tone: 'bg-amber-50 text-amber-700', badge: this.approvals() }] : []),
    ...(this.canTeam ? [{ name: 'Who’s in today', link: '/attendance/team', icon: 'team', tone: 'bg-emerald-50 text-emerald-700', badge: 0 }] : []),
    { name: 'Holidays', link: '/time-off/holidays', icon: 'hol', tone: 'bg-teal-50 text-teal-700', badge: 0 },
  ]);

  constructor() {
    void this.load();
    if (this.canApprove || this.canTeam)
      Promise.all([
        firstValueFrom(this.timeOff.approvals().pipe(catchError(() => of([])))),
        firstValueFrom(this.timeOff.compOffApprovals().pipe(catchError(() => of([])))),
        firstValueFrom(this.att.approvals().pipe(catchError(() => of([])))),
      ]).then(([a, b, c]) => this.approvals.set(a.length + b.length + c.length));
  }
  async load() {
    try { this.month.set(await firstValueFrom(this.att.me())); }
    catch { this.failed.set(true); }
    finally { this.loading.set(false); }
  }
  punched(_: Today) { void this.load(); }
}
