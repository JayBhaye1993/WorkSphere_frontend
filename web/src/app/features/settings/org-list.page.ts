import { Component, ElementRef, computed, inject, input, signal, viewChild, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';
import { SettingsService } from './settings.service';
import { FieldDef, KINDS, KindDef } from './org-kinds';
import { ToastService } from '../../core/services/toast.service';
import { errorText } from '../people/people-errors';

type Sheet = { mode: 'edit'; item: any | null } | { mode: 'delete'; item: any; reason: string | null } | null;

/** One screen for every simple company list: teams, job titles, locations, grades, employment types. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucidePlus, LucideTrash2, LucideX],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to company settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900">
          <svg lucideArrowLeft [size]="22" aria-hidden="true"></svg>
        </a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">{{ def()?.title }}</h1>
        @if (def()) {
          <button type="button" (click)="openEdit(null)" class="mr-2 h-10 px-3.5 rounded-10 bg-indigo-600 text-white text-[14px] font-semibold flex items-center gap-1.5 cursor-pointer border-0 hover:bg-indigo-700">
            <svg lucidePlus [size]="18" aria-hidden="true"></svg>Add</button>
        }
      </header>

      @if (!def()) {
        <div class="m-4 ws-alert" role="alert">This list does not exist.</div>
      } @else {
        <div class="p-4 flex flex-col gap-2.5">
          <p class="m-0 mb-1 px-1 text-[13px] leading-relaxed text-slate-600">{{ def()!.intro }}</p>
          @if (loading()) {
            @for (i of [1,2,3]; track i) { <div class="h-[72px] rounded-14 bg-white border border-slate-200 animate-pulse"></div> }
          } @else if (loadError()) {
            <div class="ws-alert" role="alert">{{ loadError() }}</div>
          } @else if (!rows().length) {
            <div class="p-6 rounded-14 bg-white border border-slate-200 text-center text-[14px] text-slate-600">No {{ def()!.singular }}s yet. Tap Add to create the first one.</div>
          } @else {
            <ul class="list-none m-0 p-0 flex flex-col gap-2.5">
              @for (r of rows(); track r.item.id) {
                <li class="flex items-center gap-1 pl-4 pr-1 py-2 rounded-14 bg-white border border-slate-200" [class.opacity-70]="r.view.muted">
                  <button type="button" (click)="openEdit(r.item)" class="flex-1 min-w-0 min-h-[52px] text-left bg-transparent border-0 p-0 cursor-pointer flex flex-col justify-center gap-1">
                    <span class="flex items-center gap-2 text-[15px] font-semibold text-slate-900">{{ r.view.title }}
                      @if (r.view.badge) { <span class="px-2 py-px rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">{{ r.view.badge }}</span> }
                    </span>
                    <span class="text-[13px] text-slate-600">{{ r.view.sub }}</span>
                  </button>
                  <button type="button" (click)="openDelete(r.item)" [attr.aria-label]="'Delete ' + r.view.title"
                          class="w-11 h-11 flex items-center justify-center rounded-full bg-transparent border-0 text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <svg lucideTrash2 [size]="18" aria-hidden="true"></svg>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>

    @if (sheet(); as s) {
      <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="close()" (keydown.escape)="close()">
        <section #dialog role="dialog" aria-modal="true" [attr.aria-label]="sheetTitle()" tabindex="-1" (click)="$event.stopPropagation()"
                 class="w-full lg:max-w-[480px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4 outline-none">
          <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
          <div class="flex items-center gap-2">
            <h2 class="m-0 flex-1 text-[19px] font-bold">{{ sheetTitle() }}</h2>
            <button type="button" (click)="close()" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
          </div>
          @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }

          @if (s.mode === 'edit') {
            <form class="flex flex-col gap-3.5" (submit)="$event.preventDefault(); save()" novalidate>
              @for (fd of visibleFields(); track fd.key) {
                @if (fd.type === 'checkbox') {
                  <label class="flex items-center gap-3 min-h-[48px] cursor-pointer">
                    <span class="flex-1 flex flex-col"><span class="text-[15px] font-semibold">{{ fd.label }}</span>
                      @if (locked(fd); as why) { <span class="text-[12px] text-slate-600">{{ why }}</span> } @else if (fd.hint) { <span class="text-[12px] text-slate-600">{{ fd.hint }}</span> }</span>
                    <input type="checkbox" class="w-6 h-6 accent-indigo-600" [checked]="!!form()[fd.key]" [disabled]="!!locked(fd)" (change)="set(fd.key, $any($event.target).checked)">
                  </label>
                } @else {
                  <label class="ws-field">{{ fd.label }}@if (!fd.required && fd.type !== 'select') { <span class="hint -mt-1">Optional</span> }
                    @if (fd.type === 'select') {
                      <select class="ws-input" (change)="set(fd.key, $any($event.target).value)">
                        @if (!fd.required) { <option value="" [selected]="!form()[fd.key]">None</option> }
                        @for (o of optionsFor(fd); track o.value) { <option [value]="o.value" [selected]="o.value === form()[fd.key]">{{ o.label }}</option> }
                      </select>
                    } @else if (fd.type === 'textarea') {
                      <textarea class="ws-input" rows="3" [value]="form()[fd.key] ?? ''" (input)="set(fd.key, $any($event.target).value)"></textarea>
                    } @else {
                      <input class="ws-input" [type]="fd.type === 'number' ? 'number' : 'text'" [attr.inputmode]="fd.type === 'number' ? 'numeric' : null"
                             [attr.min]="fd.min ?? null" [attr.max]="fd.max ?? null" [placeholder]="fd.placeholder ?? ''"
                             [value]="form()[fd.key] ?? ''" (input)="set(fd.key, $any($event.target).value)" [attr.aria-invalid]="tried() && !!fieldError(fd)">
                    }
                    @if (tried() && fieldError(fd); as e) { <span class="err">{{ e }}</span> }
                    @else if (fd.hint) { <span class="hint">{{ fd.hint }}</span> }
                  </label>
                }
              }
              <button type="submit" class="ws-btn ws-btn-primary mt-1" [disabled]="busy()">{{ busy() ? 'Saving…' : (s.item ? 'Save changes' : 'Add ' + def()!.singular) }}</button>
            </form>
          } @else {
            @if (s.reason) {
              <p class="m-0 text-[15px] leading-relaxed text-slate-700">{{ s.reason }}</p>
              <button type="button" (click)="close()" class="ws-btn ws-btn-ghost">OK</button>
            } @else {
              <p class="m-0 text-[15px] leading-relaxed text-slate-700">No one uses it. You can add it again later.</p>
              <button type="button" (click)="confirmDelete()" [disabled]="busy()" class="ws-btn text-white bg-red-600 hover:opacity-90">{{ busy() ? 'Deleting…' : 'Delete' }}</button>
              <button type="button" (click)="close()" class="ws-btn ws-btn-ghost">Keep it</button>
            }
          }
        </section>
      </div>
    }
  `,
})
export class OrgListPage {
  /** Route parameter: departments | designations | locations | grades | employment-types. */
  readonly kind = input.required<string>();
  private readonly svc = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  readonly def = computed<KindDef | undefined>(() => KINDS[this.kind()]);
  readonly items = signal<any[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly sheet = signal<Sheet>(null);
  readonly form = signal<Record<string, any>>({});
  readonly busy = signal(false);
  readonly tried = signal(false);
  readonly sheetError = signal<string | null>(null);

  readonly rows = computed(() => {
    const d = this.def(); if (!d) return [];
    const all = this.items();
    return all.map(item => ({ item, view: d.row(item, all) }))
      .sort((a, b) => this.kind() === 'departments' ? a.view.title.localeCompare(b.view.title) : d.sort(a.item, b.item));
  });

  readonly sheetTitle = computed(() => {
    const s = this.sheet(); const d = this.def(); if (!s || !d) return '';
    if (s.mode === 'delete') return s.reason ? `Can't delete ${d.row(s.item, this.items()).title} yet` : `Delete ${d.row(s.item, this.items()).title}?`;
    return s.item ? `Edit ${d.singular}` : `New ${d.singular}`;
  });

  readonly visibleFields = computed(() => {
    const s = this.sheet(); const d = this.def();
    return (d?.fields ?? []).filter(f => !f.editOnly || (s?.mode === 'edit' && s.item));
  });

  constructor() {
    effect(() => { if (this.def()) void this.load(); }, { allowSignalWrites: true });
    // Move focus into the sheet when it opens (keyboard and screen-reader users).
    effect(() => { const el = this.dialog()?.nativeElement; if (el) setTimeout(() => ((el.querySelector('input,select,textarea') ?? el.querySelector('button:not([aria-label=Close])') ?? el) as HTMLElement).focus(), 0); });
  }

  private async load() {
    this.loading.set(true); this.loadError.set(null);
    try { this.items.set(await firstValueFrom(this.svc.list<any>(this.def()!.path))); }
    catch (e) { this.loadError.set(errorText(e, 'Could not load this list.')); }
    finally { this.loading.set(false); }
  }

  optionsFor(fd: FieldDef) {
    const s = this.sheet();
    return fd.options ? fd.options(this.items(), s?.mode === 'edit' ? s.item : null) : [];
  }
  locked(fd: FieldDef) { const s = this.sheet(); return fd.locked ? fd.locked(s?.mode === 'edit' ? s.item : null) : null; }

  fieldError(fd: FieldDef): string | null {
    const v = this.form()[fd.key];
    if (fd.required && (v === '' || v === null || v === undefined || (typeof v === 'string' && !v.trim()))) return `${fd.label} is required.`;
    if (fd.type === 'number' && v !== '' && v !== null) {
      const n = Number(v);
      if (!Number.isInteger(n)) return 'Enter a whole number.';
      if (fd.min !== undefined && n < fd.min || fd.max !== undefined && n > fd.max) return `Enter ${fd.min} to ${fd.max}.`;
    }
    return null;
  }

  set(k: string, v: unknown) { this.form.update(f => ({ ...f, [k]: v })); this.sheetError.set(null); }

  openEdit(item: any | null) {
    this.tried.set(false); this.sheetError.set(null);
    this.form.set(this.def()!.init(item));
    this.sheet.set({ mode: 'edit', item });
  }
  openDelete(item: any) {
    this.sheetError.set(null);
    this.sheet.set({ mode: 'delete', item, reason: this.def()!.blocked(item, this.items()) });
  }
  close() { if (!this.busy()) this.sheet.set(null); }

  async save() {
    const s = this.sheet(); const d = this.def()!;
    if (!s || s.mode !== 'edit') return;
    this.tried.set(true);
    if (this.visibleFields().some(f => this.fieldError(f))) return;
    this.busy.set(true); this.sheetError.set(null);
    try {
      const body = d.body(this.form(), s.item);
      if (s.item) await firstValueFrom(this.svc.update(d.path, s.item.id, body));
      else await firstValueFrom(this.svc.create(d.path, body));
      this.toast.show(s.item ? 'Saved.' : `${String(this.form()['name']).trim()} added.`);
      this.busy.set(false); this.sheet.set(null);
      await this.load();
    } catch (e) {
      this.sheetError.set(errorText(e, 'Could not save. Please try again.'));
      this.busy.set(false);
    }
  }

  async confirmDelete() {
    const s = this.sheet(); const d = this.def()!;
    if (!s || s.mode !== 'delete') return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.svc.remove(d.path, s.item.id));
      this.toast.show(`${d.row(s.item, this.items()).title} deleted.`);
      this.busy.set(false); this.sheet.set(null);
      await this.load();
    } catch (e) {
      this.sheetError.set(errorText(e, 'Could not delete.'));
      this.busy.set(false);
    }
  }
}
