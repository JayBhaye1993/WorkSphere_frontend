import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideX } from '@lucide/angular';
import { AccessService, PermissionDef, Role } from './access.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorText } from '../people/people-errors';

const SCOPE_LABEL: Record<string, string> = { own: 'Own', team: 'Team', all: 'All' };

/** Create or edit a role: name, description and its permissions, each with a scope where it has one. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideX],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full flex flex-col">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings/roles" aria-label="Close" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideX [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold truncate">{{ role() ? role()!.name : 'New role' }}</h1>
      </header>
      @if (loading()) { <p class="p-4 text-[14px] text-slate-600">Loading…</p> }
      @else {
        <form class="flex-1 p-4 flex flex-col gap-4" (submit)="$event.preventDefault(); save()" novalidate>
          @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
          @if (role()?.isAdmin) {
            <p class="m-0 p-4 rounded-12 bg-indigo-50 text-[14px] text-indigo-700">Admin always has every permission at full scope, so the company can never lock itself out. You can rename it or change its description.</p>
          } @else if (readOnly()) {
            <p class="m-0 p-4 rounded-12 bg-slate-100 text-[14px] text-slate-700">You can see this role but not change it. Changing roles needs the "Manage roles" permission.</p>
          }
          <section class="ws-card">
            <label class="ws-field">Role name
              <input class="ws-input" [value]="name()" [disabled]="readOnly()" (input)="name.set($any($event.target).value); error.set(null)" placeholder="e.g. Delivery Head" [attr.aria-invalid]="tried() && !name().trim()">
              @if (tried() && !name().trim()) { <span class="err">Enter a name.</span> }
            </label>
            <label class="ws-field">What it's for <span class="hint -mt-1">Optional</span>
              <input class="ws-input" [value]="description()" [disabled]="readOnly()" (input)="description.set($any($event.target).value)" placeholder="e.g. Runs delivery for client accounts">
            </label>
          </section>

          @for (g of groups(); track g.group) {
            <section class="ws-card !gap-0 !py-1">
              <h2 class="ws-card-h pt-3 pb-1">{{ g.group }}</h2>
              @for (p of g.items; track p.key) {
                <div class="py-3 border-b border-slate-100 last:border-b-0 flex flex-col gap-2">
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" class="mt-0.5 w-5 h-5 accent-indigo-600 shrink-0" [checked]="isOn(p.key)" [disabled]="lockPerms()" (change)="toggle(p)">
                    <span class="flex flex-col gap-0.5"><span class="text-[15px] font-semibold">{{ p.name }}</span><span class="text-[12px] leading-snug text-slate-600">{{ p.description }}</span></span>
                  </label>
                  @if (p.scoped && isOn(p.key)) {
                    <div role="radiogroup" [attr.aria-label]="p.name + ' scope'" class="ml-8 inline-grid grid-flow-col auto-cols-fr p-1 rounded-10 bg-slate-100 self-start">
                      @for (s of p.scopes; track s) {
                        <button type="button" role="radio" [attr.aria-checked]="scope(p.key) === s" [disabled]="lockPerms()" (click)="setScope(p.key, s)"
                                class="h-9 px-4 rounded-8 border-0 text-[13px] cursor-pointer" [class.seg-on]="scope(p.key) === s" [class.seg-off]="scope(p.key) !== s">{{ scopeLabel[s] ?? s }}</button>
                      }
                    </div>
                  }
                </div>
              }
            </section>
          }

          @if (role() && !role()!.isSystem && !readOnly()) {
            <section class="flex flex-col gap-2 pt-2 border-t border-slate-200">
              @if (role()!.activeUsers > 0) {
                <p class="m-0 text-[13px] text-slate-600">{{ role()!.activeUsers === 1 ? '1 person has' : role()!.activeUsers + ' people have' }} this role. Give them another role before deleting it.</p>
              } @else if (!confirmDelete()) {
                <button type="button" (click)="confirmDelete.set(true)" class="self-start h-11 px-4 rounded-10 border border-red-100 bg-red-50 text-red-600 text-[14px] font-semibold cursor-pointer">Delete this role</button>
              } @else {
                <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm delete">
                  <span class="text-[14px] font-semibold">Delete {{ role()!.name }}?</span>
                  <button type="button" (click)="remove()" [disabled]="busy()" class="h-11 px-4 rounded-10 border-0 bg-red-600 text-white text-[14px] font-semibold cursor-pointer">Delete</button>
                  <button type="button" (click)="confirmDelete.set(false)" class="h-11 px-4 rounded-10 border border-slate-300 bg-white text-[14px] font-semibold cursor-pointer">Keep it</button>
                </div>
              }
            </section>
          }

          @if (!readOnly()) {
            <div class="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-200 mt-auto flex items-center gap-3">
              <span class="flex-1 text-[13px] text-slate-600">{{ role()?.isAdmin ? 'All permissions' : chosenCount() + ' permission' + (chosenCount() === 1 ? '' : 's') }}</span>
              <button type="submit" class="ws-btn ws-btn-primary" [disabled]="busy() || (!!role() && !dirty())">{{ busy() ? 'Saving…' : role() ? (dirty() ? 'Save role' : 'No changes') : 'Create role' }}</button>
            </div>
          }
        </form>
      }
    </div>
  `,
  styles: [`.seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,.08); } .seg-off { background:transparent; color:#475569; font-weight:500; }`],
})
export class RoleEditPage {
  readonly id = input<string | undefined>(undefined);
  private readonly access = inject(AccessService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly canManage = inject(AuthService).can('roles.manage');
  readonly scopeLabel = SCOPE_LABEL;

  readonly loading = signal(true); readonly busy = signal(false); readonly tried = signal(false); readonly confirmDelete = signal(false);
  readonly error = signal<string | null>(null);
  readonly role = signal<Role | null>(null);
  readonly catalog = signal<PermissionDef[]>([]);
  readonly name = signal(''); readonly description = signal('');
  /** key -> scope ('' for unscoped). */
  readonly perms = signal<Record<string, string>>({});
  private original = '';

  readonly readOnly = computed(() => !this.canManage);
  readonly lockPerms = computed(() => this.readOnly() || !!this.role()?.isAdmin);
  readonly groups = computed(() => {
    const by = new Map<string, PermissionDef[]>();
    for (const p of this.catalog()) by.set(p.group, [...(by.get(p.group) ?? []), p]);
    return [...by.entries()].map(([group, items]) => ({ group, items }));
  });
  readonly chosenCount = computed(() => Object.keys(this.perms()).length);
  readonly dirty = computed(() => this.snapshot() !== this.original);

  constructor() {
    // Reload when the address moves to another role (the component is reused).
    effect(() => { this.id(); untracked(() => void this.load()); });
  }

  private async load() {
    this.loading.set(true); this.error.set(null); this.role.set(null); this.perms.set({}); this.name.set(''); this.description.set('');
    this.confirmDelete.set(false); this.tried.set(false);
    try {
      const [catalog, roles] = await Promise.all([firstValueFrom(this.access.catalog()), firstValueFrom(this.access.roles())]);
      this.catalog.set(catalog);
      if (this.id()) {
        const r = roles.find(x => x.id === this.id());
        if (!r) this.error.set('This role no longer exists.');
        else {
          this.role.set(r); this.name.set(r.name); this.description.set(r.description ?? '');
          const map: Record<string, string> = {};
          for (const e of r.isAdmin ? catalog.map(p => p.scoped ? `${p.key}:all` : p.key) : r.permissions) { const [k, s] = e.split(':'); map[k] = s ?? ''; }
          this.perms.set(map);
        }
      }
      this.original = this.snapshot();
    } catch (e) { this.error.set(errorText(e, 'Could not load roles.')); }
    finally { this.loading.set(false); }
  }

  private snapshot() { return JSON.stringify([this.name().trim(), this.description().trim(), Object.entries(this.perms()).sort()]); }
  isOn(key: string) { return key in this.perms(); }
  scope(key: string) { return this.perms()[key]; }
  toggle(p: PermissionDef) {
    this.perms.update(m => {
      const n = { ...m };
      if (p.key in n) delete n[p.key];
      else n[p.key] = p.scoped ? (p.scopes.includes('own') ? 'own' : p.scopes[0]) : '';   // start narrow
      return n;
    });
    this.error.set(null);
  }
  setScope(key: string, s: string) { this.perms.update(m => ({ ...m, [key]: s })); }

  async save() {
    this.tried.set(true);
    if (!this.name().trim()) return;
    const body = {
      name: this.name().trim(), description: this.description().trim() || null,
      permissions: Object.entries(this.perms()).map(([k, s]) => s ? `${k}:${s}` : k),
    };
    this.busy.set(true); this.error.set(null);
    try {
      if (this.role()) await firstValueFrom(this.access.updateRole(this.role()!.id, body));
      else await firstValueFrom(this.access.createRole(body));
      this.toast.show(this.role() ? `${body.name} saved. Changes reach people within 15 minutes.` : `${body.name} created.`);
      await this.router.navigate(['/more/settings/roles']);
    } catch (e) { this.error.set(errorText(e, 'Could not save this role.')); }
    finally { this.busy.set(false); }
  }

  async remove() {
    const r = this.role(); if (!r) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.access.deleteRole(r.id));
      this.toast.show(`${r.name} deleted.`);
      await this.router.navigate(['/more/settings/roles']);
    } catch (e) { this.error.set(errorText(e, 'Could not delete this role.')); }
    finally { this.busy.set(false); }
  }
}
