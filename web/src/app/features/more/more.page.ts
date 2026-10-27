import { Component, inject } from '@angular/core';
import { LucideLogOut } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  standalone: true,
  imports: [AvatarComponent, LucideLogOut],
  template: `
    <div class="mx-auto max-w-[640px] px-4 pt-5 pb-10 flex flex-col gap-4">
      <h1 class="m-0 text-[26px] font-bold tracking-tight">More</h1>
      @if (auth.user(); as u) {
        <section class="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-14">
          <ws-avatar [name]="u.fullName" [size]="48" />
          <div class="min-w-0 flex flex-col">
            <span class="text-[16px] font-semibold">{{ u.fullName }}</span>
            <span class="text-[13px] text-slate-600 truncate">{{ u.email }}</span>
            <span class="text-[12px] text-slate-600">{{ u.roles.join(' · ') }}</span>
          </div>
        </section>
      }
      <button type="button" (click)="auth.logout()"
              class="flex items-center gap-3 min-h-[52px] px-4 bg-white border border-slate-200 rounded-14 text-[15px] font-semibold text-red-600 cursor-pointer">
        <svg lucideLogOut [size]="20" aria-hidden="true"></svg>Sign out
      </button>
    </div>
  `,
})
export class MorePage {
  readonly auth = inject(AuthService);
}
