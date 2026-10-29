import { Component, inject } from '@angular/core';
import { NotificationsService } from '../../features/notifications/notifications.service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastComponent } from '../../core/components/toast/toast.component';
import { LucideBell, LucideCalendarDays, LucideEllipsis, LucideHouse, LucideSquareKanban, LucideUsers } from '@lucide/angular';

/**
 * The app-wide frame. Phone: content above a five-item bottom bar.
 * 1024 px and up (and the desktop app): the same five items as a slim left rail.
 */
@Component({
  selector: 'ws-app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, LucideHouse, LucideSquareKanban, LucideUsers, LucideCalendarDays, LucideEllipsis, LucideBell],
  template: `
    <div class="flex h-[100dvh] flex-col lg:flex-row bg-slate-50 text-slate-900">
      <main class="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain">
        <router-outlet />
      </main>
      <nav aria-label="Main"
           class="lg:order-first shrink-0 bg-white border-t lg:border-t-0 lg:border-r border-slate-200
                  grid grid-cols-5 lg:flex lg:flex-col lg:w-[84px] lg:pt-4 lg:gap-1 pb-[env(safe-area-inset-bottom)]">
        <a routerLink="/home" routerLinkActive="is-active" ariaCurrentWhenActive="page" class="nav-item">
          <svg lucideHouse [size]="22" aria-hidden="true"></svg>Home</a>
        <a routerLink="/tasks" routerLinkActive="is-active" ariaCurrentWhenActive="page" class="nav-item">
          <svg lucideSquareKanban [size]="22" aria-hidden="true"></svg>Tasks</a>
        <a routerLink="/people" routerLinkActive="is-active" ariaCurrentWhenActive="page" class="nav-item">
          <svg lucideUsers [size]="22" aria-hidden="true"></svg>People</a>
        <a routerLink="/time-off" routerLinkActive="is-active" ariaCurrentWhenActive="page" class="nav-item">
          <svg lucideCalendarDays [size]="22" aria-hidden="true"></svg>Time off</a>
        <a routerLink="/notifications" routerLinkActive="is-active" ariaCurrentWhenActive="page" class="nav-item rail-only relative" [attr.aria-label]="inboxLabel()">
          <svg lucideBell [size]="22" aria-hidden="true"></svg>Inbox
          @if (notes.unread() > 0) { <span class="badge" aria-hidden="true">{{ notes.unread() > 99 ? '99+' : notes.unread() }}</span> }</a>
        <a routerLink="/more" routerLinkActive="is-active" ariaCurrentWhenActive="page" class="nav-item relative" [attr.aria-label]="moreLabel()">
          <svg lucideEllipsis [size]="22" aria-hidden="true"></svg>More
          @if (notes.unread() > 0) { <span class="badge lg:hidden" aria-hidden="true">{{ notes.unread() > 99 ? '99+' : notes.unread() }}</span> }</a>
      </nav>
    </div>
    <ws-toast />
  `,
  styles: [`
    .nav-item { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
      min-height:64px; font-size:12px; font-weight:500; color:#475569; text-decoration:none; border-radius:12px; }
    .nav-item:hover { color:#0f172a; }
    .nav-item:focus-visible { outline:2px solid #4f46e5; outline-offset:-4px; }
    .nav-item.is-active { color:#4338ca; font-weight:600; }
    .rail-only { display:none; }
    .badge { position:absolute; top:6px; left:calc(50% + 6px); min-width:18px; height:18px; padding:0 4px; border-radius:999px;
      background:#e11d48; color:#fff; font-size:11px; font-weight:700; line-height:18px; text-align:center; }
    @media (min-width:1024px) {
      .rail-only { display:flex; }
      .nav-item { margin:0 8px; min-height:60px; }
      .nav-item.is-active { background:#eef2ff; }
    }
  `],
})
export class AppShellComponent {
  readonly notes = inject(NotificationsService);
  constructor() { this.notes.start(); }
  inboxLabel() { const n = this.notes.unread(); return n ? `Inbox, ${n} unread` : 'Inbox'; }
  moreLabel() { const n = this.notes.unread(); return n ? `More, ${n} unread notifications` : 'More'; }
}
