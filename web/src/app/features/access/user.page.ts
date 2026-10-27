import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft } from '@lucide/angular';
import { AccessService, Role, UserSummary, relative } from './access.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorText } from '../people/people-errors';

/** One login: its roles, invite state, and switching it off or on. */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, LucideArrowLeft],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full flex flex-col">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings/users" aria-label="Back to users" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Login</h1>
      </header>
      @if (loading()) { <p class="p-4 text-[14px] text-slate-600">Loading…</p> }
      @else if (!user()) { <div class="m-4 ws-alert" role="alert">{{ error() ?? 'User not found.' }}</div> }
      @else {
        @let u = user()!;
        <div class="flex-1 p-4 flex flex-col gap-4">
          <section class="flex items-center gap-3">
            <ws-avatar [name]="u.fullName" [size]="52" />
            <div class="min-w-0 flex flex-col gap-0.5">
              <span class="text-[17px] font-bold">{{ u.fullName }}</span>
              <span class="text-[13px] text-slate-600 truncate">{{ u.email }}</span>
              <span class="text-[12px] font-semibold" [class.text-green-600]="u.status === 'Active'" [class.text-amber-600]="u.status === 'Invited'" [class.text-red-600]="u.status === 'Deactivated'">{{ statusLine() }}</span>
            </div>
          </section>

          @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }

          <section class="ws-card">
            <h2 class="ws-card-h">Roles</h2>
            <p class="m-0 text-[13px] text-slate-600">Permissions add up across roles; the widest scope wins.</p>
            @for (r of roles(); track r.id) {
              <label class="flex items-center gap-3 min-h-[48px] cursor-pointer">
                <input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="chosen().includes(r.id)" [disabled]="u.status === 'Deactivated'" (change)="toggle(r.id)">
                <span class="flex flex-col"><span class="text-[15px] font-semibold">{{ r.name }}</span>@if (r.description) {<span class="text-[12px] text-slate-600">{{ r.description }}</span>}</span>
              </label>
            }
            <button type="button" class="ws-btn ws-btn-primary" [disabled]="busy() || !rolesDirty() || !chosen().length" (click)="saveRoles()">
              {{ !chosen().length ? 'Choose at least one role' : rolesDirty() ? 'Save roles' : 'No changes' }}</button>
            <p class="m-0 text-[12px] text-slate-600">Takes effect the next time {{ firstName() }} signs in or their session renews (within 15 minutes).</p>
          </section>

          <section class="ws-card">
            <h2 class="ws-card-h">Sign-in</h2>
            @if (u.status === 'Invited') {
              <p class="m-0 text-[14px]">{{ firstName() }} hasn't set a password yet.</p>
              <button type="button" class="ws-btn ws-btn-ghost" [disabled]="busy()" (click)="resend()">Send the invite again</button>
            }
            @if (u.status !== 'Deactivated') {
              @if (isMe()) {
                <p class="m-0 text-[13px] text-slate-600">You can't switch off your own login.</p>
              } @else if (!confirmOff()) {
                <button type="button" class="ws-btn bg-red-50 text-red-600 border border-red-100" (click)="confirmOff.set(true)">Switch off login</button>
              } @else {
                <p class="m-0 text-[14px]">{{ firstName() }} will be signed out everywhere and can't sign in until you switch it back on. Their employee profile is not changed.</p>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" class="ws-btn bg-red-600 text-white" [disabled]="busy()" (click)="deactivate()">Switch off</button>
                  <button type="button" class="ws-btn ws-btn-ghost" (click)="confirmOff.set(false)">Keep on</button>
                </div>
              }
            } @else {
              <p class="m-0 text-[14px]">{{ firstName() }} can't sign in.</p>
              <button type="button" class="ws-btn ws-btn-primary" [disabled]="busy()" (click)="activate()">Switch login back on</button>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class UserPage {
  readonly id = input.required<string>();
  private readonly access = inject(AccessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(true); readonly busy = signal(false); readonly confirmOff = signal(false);
  readonly error = signal<string | null>(null);
  readonly user = signal<UserSummary | null>(null);
  readonly roles = signal<Role[]>([]);
  readonly chosen = signal<string[]>([]);
  readonly firstName = computed(() => this.user()?.fullName.split(' ')[0] ?? '');
  readonly isMe = computed(() => this.user()?.id === this.auth.user()?.id);
  readonly rolesDirty = computed(() => [...this.chosen()].sort().join() !== (this.user()?.roles.map(r => r.id).sort().join() ?? ''));
  readonly statusLine = computed(() => {
    const u = this.user(); if (!u) return '';
    if (u.status === 'Invited') return `Invited · link expires ${relative(u.inviteExpiresAt)}`;
    if (u.status === 'Deactivated') return 'Login switched off';
    return u.lastLoginAt ? `Active · signed in ${relative(u.lastLoginAt)}` : 'Active · never signed in';
  });

  constructor() {
    // Reload when the address moves to another user (the component is reused).
    effect(() => { const id = this.id(); untracked(() => void this.load(id)); });
  }

  private async load(id: string) {
    this.loading.set(true); this.error.set(null); this.confirmOff.set(false);
    try {
      const [u, roles] = await Promise.all([firstValueFrom(this.access.user(id)), firstValueFrom(this.access.roles())]);
      this.roles.set([...roles].sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.name.localeCompare(b.name)));
      this.set(u);
    } catch (e) { this.error.set(errorText(e, 'Could not load this user.')); }
    finally { this.loading.set(false); }
  }
  private set(u: UserSummary) { this.user.set(u); this.chosen.set(u.roles.map(r => r.id)); }
  toggle(id: string) { this.chosen.update(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]); this.error.set(null); }

  private async run(fn: () => Promise<void>) {
    this.busy.set(true); this.error.set(null);
    try { await fn(); } catch (e) { this.error.set(errorText(e, 'That did not work. Please try again.')); }
    finally { this.busy.set(false); }
  }
  saveRoles() { return this.run(async () => { this.set(await firstValueFrom(this.access.setRoles(this.id(), this.chosen()))); this.toast.show('Roles saved.'); }); }
  resend() { return this.run(async () => { await firstValueFrom(this.access.resendInvite(this.id())); this.set(await firstValueFrom(this.access.user(this.id()))); this.toast.show(`Invite sent again to ${this.user()!.email}.`); }); }
  deactivate() { return this.run(async () => { await firstValueFrom(this.access.deactivate(this.id())); this.confirmOff.set(false); this.set(await firstValueFrom(this.access.user(this.id()))); this.toast.show('Login switched off.'); }); }
  activate() { return this.run(async () => { await firstValueFrom(this.access.activate(this.id())); this.set(await firstValueFrom(this.access.user(this.id()))); this.toast.show('Login switched back on.'); }); }
}
