import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight, LucidePlus } from '@lucide/angular';
import { AccessService, Role } from './access.service';
import { AuthService } from '../../core/auth/auth.service';
import { errorText } from '../people/people-errors';

/** Roles are named bundles of permissions. Every company starts with Admin, HR, Manager and Employee. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideChevronRight, LucidePlus],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to company settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Roles and permissions</h1>
        @if (canManage) {
          <a routerLink="/more/settings/roles/new" class="mr-2 h-10 px-3.5 rounded-10 bg-indigo-600 text-white text-[14px] font-semibold flex items-center gap-1.5 hover:bg-indigo-700"><svg lucidePlus [size]="18" aria-hidden="true"></svg>Add</a>
        }
      </header>
      <div class="p-4 flex flex-col gap-2.5">
        <p class="m-0 mb-1 px-1 text-[13px] leading-relaxed text-slate-600">A role is a set of permissions. A person can hold several roles; they get everything those roles allow.@if (!canManage) { Only people who manage roles can change them. }</p>
        @if (loading()) { <p class="text-[14px] text-slate-600">Loading…</p> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else {
          <ul class="list-none m-0 p-0 flex flex-col gap-2.5">
            @for (r of roles(); track r.id) {
              <li>
                <a [routerLink]="['/more/settings/roles', r.id]" class="flex items-center gap-3 min-h-[72px] px-4 py-2 rounded-14 bg-white border border-slate-200 text-slate-900 no-underline hover:bg-slate-50">
                  <span class="flex-1 min-w-0 flex flex-col gap-1">
                    <span class="flex items-center gap-2 text-[15px] font-semibold">{{ r.name }}
                      @if (r.isAdmin) { <span class="tag">Everything</span> } @else if (r.isSystem) { <span class="tag">Starter</span> }
                    </span>
                    @if (r.description) { <span class="text-[13px] text-slate-600">{{ r.description }}</span> }
                    <span class="text-[12px] text-slate-600">{{ r.isAdmin ? 'All permissions' : r.permissions.length + ' permission' + (r.permissions.length === 1 ? '' : 's') }} · {{ r.activeUsers === 1 ? '1 person' : r.activeUsers + ' people' }}</span>
                  </span>
                  <svg lucideChevronRight [size]="16" class="text-slate-400" aria-hidden="true"></svg>
                </a>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styles: [`.tag { padding:1px 8px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:11px; font-weight:700; }`],
})
export class RolesPage {
  private readonly access = inject(AccessService);
  readonly canManage = inject(AuthService).can('roles.manage');
  readonly roles = signal<Role[]>([]); readonly loading = signal(true); readonly error = signal<string | null>(null);
  constructor() {
    firstValueFrom(this.access.roles())
      .then(r => this.roles.set([...r].sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name))))
      .catch(e => this.error.set(errorText(e, 'Could not load roles.'))).finally(() => this.loading.set(false));
  }
}
