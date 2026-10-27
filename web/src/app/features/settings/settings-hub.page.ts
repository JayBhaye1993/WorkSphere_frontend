import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight } from '@lucide/angular';
import { SettingsService } from './settings.service';
import { AuthService } from '../../core/auth/auth.service';
import { AccessService } from '../access/access.service';

interface Row { name: string; hint: string; link: string; count: string; }

/** Company settings: every list a company defines for itself. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideChevronRight],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more" aria-label="Back to More" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Company settings</h1>
      </header>
      <div class="p-4 flex flex-col gap-5">
        @for (g of groups(); track g.title) {
          <section class="flex flex-col gap-2">
            <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">{{ g.title }}</h2>
            <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
              @for (r of g.rows; track r.link) {
                <li class="border-b border-slate-100 last:border-b-0">
                  <a [routerLink]="r.link" class="flex items-center gap-3 min-h-[60px] px-4 text-slate-900 no-underline hover:bg-slate-50">
                    <span class="flex-1 flex flex-col gap-0.5"><span class="text-[15px] font-semibold">{{ r.name }}</span><span class="text-[12px] text-slate-600">{{ r.hint }}</span></span>
                    <span class="mono text-[13px] text-slate-700">{{ r.count }}</span>
                    <svg lucideChevronRight [size]="16" class="text-slate-400" aria-hidden="true"></svg>
                  </a>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
})
export class SettingsHubPage {
  private readonly svc = inject(SettingsService);
  private readonly access = inject(AccessService);
  private readonly auth = inject(AuthService);
  readonly groups = signal<{ title: string; rows: Row[] }[]>(this.build({}));

  constructor() { void this.counts(); }

  private build(c: Record<string, string>) {
    const r = (name: string, hint: string, link: string, key: string): Row => ({ name, hint, link: '/more/settings/' + link, count: c[key] ?? '' });
    const org = this.auth.can('org.manage');
    const access: Row[] = [
      ...(this.auth.can('users.manage') ? [r('Users', 'Logins, invites, switched-off accounts', 'users', 'users')] : []),
      r('Roles and permissions', 'Who can see and change what', 'roles', 'roles'),
    ];
    return [
      ...(!org ? [] : [{ title: 'Organisation', rows: [
        r('Teams', 'Departments and sub-teams', 'departments', 'departments'),
        r('Job titles', 'Titles and their level', 'designations', 'designations'),
        r('Locations', 'Offices and time zones', 'locations', 'locations'),
        r('Grades', 'Bands such as L1 to L8', 'grades', 'grades'),
      ] },
      { title: 'People', rows: [
        r('Employment types', 'Probation and notice for each', 'employment-types', 'employment-types'),
        r('Custom fields', 'Extra details you keep', 'custom-fields', 'custom-fields'),
        r('Employee code', 'How new codes look', 'employee-code', 'employee-code'),
        r('Document types', 'What you keep and who sees it', 'document-categories', 'document-categories'),
      ] },
      { title: 'Offboarding', rows: [
        r('Exit reasons', 'Why people leave', 'exit-reasons', 'exit-reasons'),
        r('Offboarding checklist', 'Steps for every exit', 'offboarding-items', 'offboarding-items'),
      ] }]),
      { title: 'Access', rows: access },
    ];
  }

  private async counts() {
    const n = (p: string, params?: Record<string, unknown>) => firstValueFrom(this.svc.list<unknown>(p, params).pipe(catchError(() => of(null))));
    const [users, roles] = await Promise.all([
      this.auth.can('users.manage') ? firstValueFrom(this.access.users({ status: 'Active', pageSize: 1 }).pipe(catchError(() => of(null)))) : Promise.resolve(null),
      firstValueFrom(this.access.roles().pipe(catchError(() => of(null)))),
    ]);
    if (!this.auth.can('org.manage')) { this.groups.set(this.build({ users: users ? String(users.totalCount) : '', roles: roles ? String(roles.length) : '' })); return; }
    const [d, ds, l, g, t, cf, code, xr, xi, dc] = await Promise.all([
      n('departments'), n('designations'), n('locations'), n('grades'), n('employment-types'), n('custom-fields', { includeInactive: true }),
      firstValueFrom(this.svc.get<{ nextCodePreview: string }>('employee-settings').pipe(catchError(() => of(null)))),
      n('exit-reasons'), n('offboarding-items'), n('document-categories'),
    ]);
    const c = (x: unknown[] | null) => x ? String(x.length) : '';
    this.groups.set(this.build({ departments: c(d), designations: c(ds), locations: c(l), grades: c(g), 'employment-types': c(t), 'custom-fields': c(cf), 'employee-code': code?.nextCodePreview ?? '', 'exit-reasons': c(xr), 'offboarding-items': c(xi), 'document-categories': c(dc),
      users: users ? String(users.totalCount) : '', roles: roles ? String(roles.length) : '' }));
  }
}
