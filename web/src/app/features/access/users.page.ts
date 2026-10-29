import { SkeletonComponent } from '../../shared/skeleton.component';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, firstValueFrom, of, switchMap, tap } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight, LucideSearch, LucideUserPlus, LucideX } from '@lucide/angular';
import { AccessService, Role, UserSummary, relative } from './access.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { ToastService } from '../../core/services/toast.service';
import { errorText } from '../people/people-errors';

const TABS = [{ key: 'Active', label: 'Active' }, { key: 'Invited', label: 'Invited' }, { key: 'Deactivated', label: 'Deactivated' }] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Everyone who can sign in: active logins, pending invites, switched-off logins. */
@Component({
  standalone: true,
  imports: [SkeletonComponent, RouterLink, AvatarComponent, LucideArrowLeft, LucideChevronRight, LucideSearch, LucideUserPlus, LucideX],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div class="h-14 px-1 flex items-center gap-1">
          <a routerLink="/more/settings" aria-label="Back to company settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
          <h1 class="m-0 flex-1 text-[18px] font-bold">Users</h1>
          <button type="button" (click)="openInvite()" class="mr-2 h-10 px-3.5 rounded-10 bg-indigo-600 text-white text-[14px] font-semibold flex items-center gap-1.5 border-0 cursor-pointer hover:bg-indigo-700">
            <svg lucideUserPlus [size]="18" aria-hidden="true"></svg>Invite</button>
        </div>
        <div class="px-4 pb-3 flex flex-col gap-3">
          <div role="tablist" aria-label="Status" class="grid grid-cols-3 p-1 rounded-12 bg-slate-100">
            @for (t of tabs; track t.key) {
              <button type="button" role="tab" [attr.aria-selected]="status() === t.key" (click)="pick(t.key)"
                      class="h-10 rounded-10 border-0 text-[14px] cursor-pointer" [class.tab-on]="status() === t.key" [class.tab-off]="status() !== t.key">
                {{ t.label }}@if (counts()[t.key] !== undefined) { <span class="mono ml-1 opacity-80">{{ counts()[t.key] }}</span> }
              </button>
            }
          </div>
          <label class="flex items-center gap-2 h-11 px-3 rounded-12 border border-slate-300 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100">
            <svg lucideSearch [size]="18" class="text-slate-600 shrink-0" aria-hidden="true"></svg>
            <span class="sr-only">Search users</span>
            <input #box type="search" placeholder="Name or email" autocomplete="off" class="flex-1 min-w-0 border-0 outline-none bg-transparent text-[16px]" (input)="typing$.next(box.value)">
          </label>
        </div>
      </header>

      @if (loading()) {
        <ws-skeleton class="block p-4" kind="form" [rows]="4" />
      } @else if (error()) {
        <div class="m-4 ws-alert" role="alert">{{ error() }}</div>
      } @else if (!users().length) {
        <p class="m-4 p-6 rounded-14 bg-white border border-slate-200 text-center text-[14px] text-slate-600">{{ emptyText() }}</p>
      } @else {
        <ul class="list-none m-0 p-0 bg-white border-y border-slate-200">
          @for (u of users(); track u.id) {
            <li class="border-b border-slate-100 last:border-b-0">
              <a [routerLink]="['/more/settings/users', u.id]" class="flex items-center gap-3 min-h-[68px] px-4 py-2 text-slate-900 no-underline hover:bg-slate-50">
                <ws-avatar [name]="u.fullName" />
                <span class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span class="text-[15px] font-semibold">{{ u.fullName }}</span>
                  <span class="text-[13px] text-slate-600 truncate">{{ u.email }}</span>
                  <span class="text-[12px] text-slate-600">{{ roleLine(u) }} · {{ when(u) }}</span>
                </span>
                <svg lucideChevronRight [size]="16" class="text-slate-400 shrink-0" aria-hidden="true"></svg>
              </a>
            </li>
          }
        </ul>
        @if (total() > users().length) { <p class="p-4 text-[13px] text-slate-600">Showing {{ users().length }} of {{ total() }}. Search to narrow down.</p> }
      }
    </div>

    @if (inviting()) {
      <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="closeInvite()" (keydown.escape)="closeInvite()">
        <section role="dialog" aria-modal="true" aria-label="Invite a login" (click)="$event.stopPropagation()"
                 class="w-full lg:max-w-[480px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
          <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
          <div class="flex items-center gap-2">
            <h2 class="m-0 flex-1 text-[19px] font-bold">Invite a login</h2>
            <button type="button" (click)="closeInvite()" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
          </div>
          <p class="m-0 text-[13px] leading-relaxed text-slate-600">For someone who needs to sign in but is not on the payroll, such as an auditor or consultant. To add an employee, use <a routerLink="/people/new" (click)="closeInvite()" class="font-semibold">Add person</a>: it creates their profile and invites them.</p>
          @if (inviteError()) { <div class="ws-alert" role="alert">{{ inviteError() }}</div> }
          <form class="flex flex-col gap-3.5" (submit)="$event.preventDefault(); sendInvite()" novalidate>
            <label class="ws-field">Full name
              <input class="ws-input" [value]="inv().fullName" (input)="setInv('fullName', $any($event.target).value)" [attr.aria-invalid]="tried() && !inv().fullName.trim()">
              @if (tried() && !inv().fullName.trim()) { <span class="err">Enter their name.</span> }
            </label>
            <label class="ws-field">Email
              <input class="ws-input" type="email" inputmode="email" [value]="inv().email" (input)="setInv('email', $any($event.target).value)" [attr.aria-invalid]="tried() && !emailOk()">
              @if (tried() && !emailOk()) { <span class="err">Enter a valid email.</span> }
            </label>
            <fieldset class="m-0 p-0 border-0 flex flex-col gap-1">
              <legend class="p-0 mb-1 text-[14px] font-semibold">Roles</legend>
              @for (r of roles(); track r.id) {
                <label class="flex items-center gap-3 min-h-[48px] cursor-pointer">
                  <input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="inv().roleIds.includes(r.id)" (change)="toggleRole(r.id)">
                  <span class="flex flex-col"><span class="text-[15px] font-semibold">{{ r.name }}</span>@if (r.description) {<span class="text-[12px] text-slate-600">{{ r.description }}</span>}</span>
                </label>
              }
              @if (tried() && !inv().roleIds.length) { <span class="text-[12px] font-medium text-red-600">Choose at least one role.</span> }
            </fieldset>
            <button type="submit" class="ws-btn ws-btn-primary" [disabled]="busy()">{{ busy() ? 'Sending…' : 'Send invite' }}</button>
          </form>
        </section>
      </div>
    }
  `,
  styles: [`.tab-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,.08); } .tab-off { background:transparent; color:#475569; font-weight:500; }`],
})
export class UsersPage {
  private readonly access = inject(AccessService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly tabs = TABS;
  readonly status = signal<string>('Active');
  readonly search = signal('');
  readonly users = signal<UserSummary[]>([]);
  readonly total = signal(0);
  readonly counts = signal<Record<string, number>>({});
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly typing$ = new Subject<string>();
  private readonly reload$ = new Subject<void>();

  readonly inviting = signal(false); readonly busy = signal(false); readonly tried = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inv = signal({ fullName: '', email: '', roleIds: [] as string[] });
  readonly emailOk = computed(() => EMAIL.test(this.inv().email.trim()));
  readonly emptyText = computed(() => this.search() ? `No one matches “${this.search()}”.` : ({ Active: 'No active logins.', Invited: 'No pending invites.', Deactivated: 'No one is switched off.' } as Record<string, string>)[this.status()]);

  constructor() {
    this.typing$.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(v => { this.search.set(v.trim()); this.reload$.next(); });
    this.reload$.pipe(
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap(() => this.access.users({ search: this.search(), status: this.status() }).pipe(catchError(e => { this.error.set(errorText(e, 'Could not load users.')); return of(null); }))),
      takeUntilDestroyed(),
    ).subscribe(r => { this.loading.set(false); if (r) { this.users.set(r.items); this.total.set(r.totalCount); } });
    this.reload$.next();
    void this.loadCounts();
    firstValueFrom(this.access.roles()).then(r => this.roles.set(r)).catch(() => {});
  }

  private async loadCounts() {
    const c: Record<string, number> = {};
    await Promise.all(TABS.map(async t => {
      const r = await firstValueFrom(this.access.users({ status: t.key, pageSize: 1 }).pipe(catchError(() => of(null))));
      if (r) c[t.key] = r.totalCount;
    }));
    this.counts.set(c);
  }

  pick(s: string) { if (s !== this.status()) { this.status.set(s); this.reload$.next(); } }
  roleLine(u: UserSummary) { return u.roles.map(r => r.name).join(', ') || 'No role'; }
  when(u: UserSummary) {
    if (u.status === 'Invited') {
      const exp = u.inviteExpiresAt ? new Date(u.inviteExpiresAt).getTime() : 0;
      return exp && exp < Date.now() ? 'Invite expired' : `Invite expires ${relative(u.inviteExpiresAt)}`;
    }
    if (u.status === 'Deactivated') return 'Login switched off';
    return u.lastLoginAt ? `Signed in ${relative(u.lastLoginAt)}` : 'Never signed in';
  }

  openInvite() {
    const emp = this.roles().find(r => r.name === 'Employee');
    this.inv.set({ fullName: '', email: '', roleIds: emp ? [emp.id] : [] });
    this.tried.set(false); this.inviteError.set(null); this.inviting.set(true);
  }
  closeInvite() { if (!this.busy()) this.inviting.set(false); }
  setInv(k: 'fullName' | 'email', v: string) { this.inv.update(x => ({ ...x, [k]: v })); this.inviteError.set(null); }
  toggleRole(id: string) { this.inv.update(x => ({ ...x, roleIds: x.roleIds.includes(id) ? x.roleIds.filter(r => r !== id) : [...x.roleIds, id] })); }

  async sendInvite() {
    this.tried.set(true);
    const v = this.inv();
    if (!v.fullName.trim() || !this.emailOk() || !v.roleIds.length) return;
    this.busy.set(true);
    try {
      const u = await firstValueFrom(this.access.invite({ fullName: v.fullName.trim(), email: v.email.trim(), roleIds: v.roleIds }));
      this.toast.show(`Invite sent to ${u.email}.`);
      this.inviting.set(false);
      await this.router.navigate(['/more/settings/users', u.id]);
    } catch (e) { this.inviteError.set(errorText(e, 'Could not send the invite.')); }
    finally { this.busy.set(false); }
  }
}
