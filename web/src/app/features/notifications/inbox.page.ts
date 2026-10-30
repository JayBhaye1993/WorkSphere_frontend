import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideBellOff, LucideCalendarDays, LucideCheckCheck, LucideListTodo, LucideSettings, LucideShield, LucideUsers, LucideClock } from '@lucide/angular';
import { InboxItem, NotificationsService } from './notifications.service';
import { errorText } from '../people/people-errors';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/skeleton.component';

/** Your notifications, newest first. Tap one to open what it's about; it's marked read. */
@Component({
  standalone: true,
  imports: [RouterLink, SkeletonComponent, LucideArrowLeft, LucideBellOff, LucideCalendarDays, LucideCheckCheck, LucideListTodo, LucideSettings, LucideShield, LucideUsers, LucideClock],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full pb-8">
      <header class="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div class="h-14 px-1 flex items-center gap-1">
          <button type="button" (click)="back()" aria-label="Back" class="w-11 h-11 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 text-slate-900 cursor-pointer"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></button>
          <h1 class="m-0 flex-1 text-[18px] font-bold">Notifications</h1>
          @if (svc.unread() > 0) {
            <button type="button" (click)="readAll()" class="h-10 px-3 flex items-center gap-1.5 rounded-full bg-transparent border-0 text-[14px] font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer"><svg lucideCheckCheck [size]="17" aria-hidden="true"></svg>Mark all read</button>
          }
          <a routerLink="/more/notifications" aria-label="Notification settings" title="Notification settings" class="w-11 h-11 mr-1 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700"><svg lucideSettings [size]="19" aria-hidden="true"></svg></a>
        </div>
        <div class="px-4 pb-3 flex gap-2" role="group" aria-label="Show">
          <button type="button" class="ws-pill" [attr.aria-pressed]="!unreadOnly()" (click)="setUnread(false)">All</button>
          <button type="button" class="ws-pill" [attr.aria-pressed]="unreadOnly()" (click)="setUnread(true)">Unread{{ svc.unread() ? ' · ' + svc.unread() : '' }}</button>
        </div>
      </header>

      <div class="p-4 flex flex-col gap-4">
        @if (loading()) { <ws-skeleton [rows]="6" /> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (!items().length) {
          <div class="p-8 rounded-14 bg-white border border-slate-200 text-center flex flex-col items-center gap-2">
            <svg lucideBellOff [size]="28" class="text-slate-400" aria-hidden="true"></svg>
            <p class="m-0 text-[15px] font-semibold">{{ unreadOnly() ? 'You’re all caught up' : 'No notifications yet' }}</p>
            <p class="m-0 text-[13px] text-slate-600">Requests waiting for you and decisions about yours show up here.</p>
          </div>
        } @else {
          @for (g of groups(); track g.label) {
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">{{ g.label }}</h2>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (n of g.items; track n.id) {
                  <li class="border-b border-slate-100 last:border-b-0">
                    <button type="button" (click)="open(n)" class="w-full flex items-start gap-3 px-4 py-3 bg-transparent border-0 text-left cursor-pointer hover:bg-slate-50" [class.bg-indigo-50]="!n.read">
                      <span class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" [class]="tint(n)" aria-hidden="true">
                        @switch (n.category) {
                          @case ('TimeOff') { <svg lucideCalendarDays [size]="17"></svg> }
                          @case ('Attendance') { <svg lucideClock [size]="17"></svg> }
                          @case ('Tasks') { <svg lucideListTodo [size]="17"></svg> }
                          @case ('Account') { <svg lucideShield [size]="17"></svg> }
                          @default { <svg lucideUsers [size]="17"></svg> }
                        }
                      </span>
                      <span class="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span class="text-[14px] leading-snug text-slate-900" [class.font-semibold]="!n.read">{{ n.title }}</span>
                        @if (n.body) { <span class="text-[13px] text-slate-600 leading-snug">{{ n.body }}</span> }
                        <span class="text-[12px] text-slate-500">{{ ago(n.createdAt) }}</span>
                      </span>
                      @if (!n.read) { <span class="mt-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"><span class="sr-only">Unread</span></span> }
                    </button>
                  </li>
                }
              </ul>
            </section>
          }
          @if (items().length < total()) {
            <button type="button" (click)="more()" [disabled]="loadingMore()" class="ws-btn ws-btn-ghost">{{ loadingMore() ? 'Loading…' : 'Show older' }}</button>
          }
        }
      </div>
    </div>
  `,
})
export class InboxPage {
  readonly svc = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  readonly items = signal<InboxItem[]>([]);
  readonly total = signal(0);
  readonly unreadOnly = signal(false);
  readonly loading = signal(true); readonly loadingMore = signal(false); readonly error = signal<string | null>(null);
  private page = 1;

  readonly groups = computed(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(week.getDate() - 6);
    const out: { label: string; items: InboxItem[] }[] = [];
    for (const n of this.items()) {
      const d = new Date(n.createdAt);
      const label = d >= today ? 'Today' : d >= week ? 'This week' : 'Earlier';
      if (!out.length || out[out.length - 1].label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(n);
    }
    return out;
  });

  constructor() { void this.load(); }

  async load() {
    this.loading.set(true); this.error.set(null); this.page = 1;
    try { const x = await firstValueFrom(this.svc.inbox({ unreadOnly: this.unreadOnly(), page: 1 })); this.items.set(x.items); this.total.set(x.total); }
    catch (e) { this.error.set(errorText(e, 'Could not load your notifications.')); }
    finally { this.loading.set(false); }
  }

  async more() {
    this.loadingMore.set(true);
    try { const x = await firstValueFrom(this.svc.inbox({ unreadOnly: this.unreadOnly(), page: ++this.page })); this.items.update(a => [...a, ...x.items]); this.total.set(x.total); }
    catch (e) { this.toast.show(errorText(e, 'Could not load more.'), 'error'); }
    finally { this.loadingMore.set(false); }
  }

  setUnread(v: boolean) { this.unreadOnly.set(v); void this.load(); }

  async open(n: InboxItem) {
    if (!n.read) {
      this.items.update(a => a.map(x => x.id === n.id ? { ...x, read: true } : x));
      firstValueFrom(this.svc.markRead(n.id)).catch(() => {});
    }
    if (n.link) void this.router.navigateByUrl(n.link);
  }

  async readAll() {
    try { await firstValueFrom(this.svc.markAllRead()); this.items.update(a => a.map(x => ({ ...x, read: true }))); if (this.unreadOnly()) this.items.set([]); }
    catch (e) { this.toast.show(errorText(e, 'Could not mark them read.'), 'error'); }
  }

  back() { if (history.length > 1) this.location.back(); else void this.router.navigate(['/home']); }

  tint(n: InboxItem) {
    return n.category === 'TimeOff' ? 'bg-sky-100 text-sky-700' : n.category === 'Attendance' ? 'bg-orange-100 text-orange-700' : n.category === 'Tasks' ? 'bg-violet-100 text-violet-700'
      : n.category === 'Account' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700';
  }

  ago(iso: string) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
}
