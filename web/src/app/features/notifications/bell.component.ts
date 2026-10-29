import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBell } from '@lucide/angular';
import { NotificationsService } from './notifications.service';

/** The bell with the unread count, for page headers. */
@Component({
  selector: 'ws-bell',
  standalone: true,
  imports: [RouterLink, LucideBell],
  template: `
    <a routerLink="/notifications" [attr.aria-label]="label()" [title]="label()"
       class="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800">
      <svg lucideBell [size]="20" aria-hidden="true"></svg>
      @if (svc.unread() > 0) {
        <span class="absolute top-1.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold leading-[18px] text-center" aria-hidden="true">{{ svc.unread() > 99 ? '99+' : svc.unread() }}</span>
      }
    </a>
  `,
})
export class BellComponent {
  readonly svc = inject(NotificationsService);
  label() { const n = this.svc.unread(); return n ? `Notifications, ${n} unread` : 'Notifications'; }
}
