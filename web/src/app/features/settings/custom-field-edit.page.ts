import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideX } from '@lucide/angular';
import { SettingsService } from './settings.service';
import { CustomField, CustomFieldType } from '../../core/models/people.models';
import { ToastService } from '../../core/services/toast.service';
import { errorText } from '../people/people-errors';
import { TYPE_LABEL } from './custom-fields.page';

const TYPES: CustomFieldType[] = ['Text', 'Number', 'Date', 'Select', 'MultiSelect', 'Boolean'];
const SECTIONS = ['Work', 'Personal', 'Other'];

/** Create or change one custom field. The type is fixed once created (existing values depend on it). */
@Component({
  standalone: true,
  imports: [RouterLink, LucideX],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full flex flex-col">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings/custom-fields" aria-label="Close without saving" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideX [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">{{ id() ? 'Edit custom field' : 'New custom field' }}</h1>
      </header>
      @if (loading()) { <p class="p-4 text-[14px] text-slate-600">Loading…</p> }
      @else {
        <form class="flex-1 p-4 flex flex-col gap-5" (submit)="$event.preventDefault(); save()" novalidate>
          @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
          <label class="ws-field">Field name
            <input class="ws-input" [value]="name()" (input)="name.set($any($event.target).value); error.set(null)" placeholder="e.g. T-shirt size" [attr.aria-invalid]="tried() && !name().trim()">
            @if (tried() && !name().trim()) { <span class="err">Enter a name.</span> }
            @else if (key()) { <span class="hint">Stored as <span class="mono text-slate-700">{{ key() }}</span></span> }
          </label>

          <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
            <legend class="p-0 mb-2 text-[14px] font-semibold">What kind of answer?</legend>
            <div class="grid grid-cols-3 gap-2">
              @for (t of types; track t) {
                <button type="button" (click)="setType(t)" [attr.aria-pressed]="type() === t" [disabled]="!!id() && type() !== t"
                        class="type-btn" [class.type-on]="type() === t">{{ typeLabel[t] }}</button>
              }
            </div>
            @if (id()) { <span class="text-[12px] text-slate-600">The type can't change once people have answers. Create a new field instead.</span> }
          </fieldset>

          @if (type() === 'Select' || type() === 'MultiSelect') {
            <section class="flex flex-col gap-2">
              <h2 class="m-0 text-[14px] font-semibold">Choices</h2>
              <div class="flex flex-wrap gap-2">
                @for (o of options(); track o) {
                  <span class="h-9 pl-3 pr-1 rounded-full bg-white border border-slate-300 text-[14px] inline-flex items-center gap-1">{{ o }}
                    <button type="button" (click)="removeOption(o)" [attr.aria-label]="'Remove ' + o" class="w-7 h-7 rounded-full flex items-center justify-center bg-transparent border-0 text-slate-600 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="14" aria-hidden="true"></svg></button>
                  </span>
                }
              </div>
              <div class="flex gap-2">
                <label class="flex-1"><span class="sr-only">New choice</span>
                  <input #opt class="ws-input" placeholder="Add a choice" (keydown.enter)="$event.preventDefault(); addOption(opt.value); opt.value=''"></label>
                <button type="button" class="ws-btn ws-btn-ghost h-[46px]" (click)="addOption(opt.value); opt.value=''">Add</button>
              </div>
              @if (tried() && !options().length) { <span class="text-[12px] font-medium text-red-600">Add at least one choice.</span> }
            </section>
          }

          <label class="ws-field">Section on the profile
            <select class="ws-input" (change)="section.set($any($event.target).value)">
              @for (s of sections; track s) { <option [value]="s" [selected]="s === section()">{{ s }}</option> }
            </select>
          </label>

          <section class="ws-card !gap-0 !py-1">
            @for (t of toggles(); track t.key) {
              <label class="flex items-center gap-3 min-h-[64px] cursor-pointer border-b border-slate-100 last:border-b-0">
                <span class="flex-1 flex flex-col gap-0.5"><span class="text-[15px] font-semibold">{{ t.label }}</span><span class="text-[12px] text-slate-600">{{ t.hint }}</span></span>
                <input type="checkbox" class="w-6 h-6 accent-indigo-600" [checked]="t.on" (change)="t.set($any($event.target).checked)">
              </label>
            }
          </section>

          @if (field(); as f) {
            <section class="flex flex-col gap-2 pt-2 border-t border-slate-200">
              <p class="m-0 text-[13px] text-slate-600">{{ f.employeeCount === 1 ? '1 person has' : f.employeeCount + ' people have' }} a value in this field.</p>
              @if (f.employeeCount > 0) {
                <p class="m-0 text-[13px] text-slate-600">To stop using it but keep their answers, switch off "In use" above.</p>
              } @else {
                @if (!confirming()) {
                  <button type="button" (click)="confirming.set(true)" class="self-start h-11 px-4 rounded-10 border border-red-100 bg-red-50 text-red-600 text-[14px] font-semibold cursor-pointer">Delete this field</button>
                } @else {
                  <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm delete">
                    <span class="text-[14px] font-semibold">Delete {{ f.name }}?</span>
                    <button type="button" (click)="remove()" [disabled]="busy()" class="h-11 px-4 rounded-10 border-0 bg-red-600 text-white text-[14px] font-semibold cursor-pointer">Delete</button>
                    <button type="button" (click)="confirming.set(false)" class="h-11 px-4 rounded-10 border border-slate-300 bg-white text-[14px] font-semibold cursor-pointer">Keep it</button>
                  </div>
                }
              }
            </section>
          }

          <div class="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-200 mt-auto">
            <button type="submit" class="ws-btn ws-btn-primary w-full" [disabled]="busy()">{{ busy() ? 'Saving…' : id() ? 'Save changes' : 'Add field' }}</button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .type-btn { height:48px; border-radius:12px; border:1px solid #cbd5e1; background:#fff; color:#334155; font:500 14px 'Geist',sans-serif; cursor:pointer; }
    .type-on { border:2px solid #4f46e5; background:#eef2ff; color:#312e81; font-weight:700; }
    .type-btn:disabled { opacity:.45; cursor:default; }
    .type-btn:focus-visible { outline:2px solid #4f46e5; outline-offset:2px; }
  `],
})
export class CustomFieldEditPage {
  readonly id = input<string | undefined>(undefined);
  private readonly svc = inject(SettingsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly types = TYPES; readonly sections = SECTIONS; readonly typeLabel = TYPE_LABEL;

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly tried = signal(false);
  readonly error = signal<string | null>(null);
  readonly confirming = signal(false);
  readonly field = signal<CustomField | null>(null);
  readonly name = signal(''); readonly type = signal<CustomFieldType>('Text'); readonly options = signal<string[]>([]);
  readonly section = signal('Work'); readonly required = signal(false); readonly sensitive = signal(false);
  readonly editable = signal(false); readonly active = signal(true);

  /** The stored key: fixed once created; for a new field, a preview of what the server will make. */
  readonly key = computed(() => this.field()?.key ?? this.name().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));

  readonly toggles = computed(() => [
    { key: 'req', label: 'Required', hint: 'HR must fill it in when adding someone.', on: this.required(), set: (v: boolean) => this.required.set(v) },
    { key: 'priv', label: 'Private', hint: 'Only HR and the person can see it. Never searchable in the directory.', on: this.sensitive(), set: (v: boolean) => this.sensitive.set(v) },
    { key: 'self', label: 'Employee can edit', hint: 'People fill it in themselves from My profile.', on: this.editable(), set: (v: boolean) => this.editable.set(v) },
    ...(this.field() ? [{ key: 'act', label: 'In use', hint: 'Switch off to hide it everywhere but keep existing answers.', on: this.active(), set: (v: boolean) => this.active.set(v) }] : []),
  ]);

  constructor() {
    effect(() => { this.id(); untracked(() => void this.load()); });   // reused component: reload on a new id
  }

  private async load() {
    this.loading.set(true); this.error.set(null); this.field.set(null); this.confirming.set(false); this.tried.set(false);
    this.name.set(''); this.type.set('Text'); this.options.set([]); this.section.set('Work');
    this.required.set(false); this.sensitive.set(false); this.editable.set(false); this.active.set(true);
    if (this.id()) {
      try {
        const all = await firstValueFrom(this.svc.list<CustomField>('custom-fields', { includeInactive: true }));
        const f = all.find(x => x.id === this.id());
        if (!f) { this.error.set('This field no longer exists.'); }
        else {
          this.field.set(f); this.name.set(f.name); this.type.set(f.fieldType); this.options.set([...f.options]);
          this.section.set(SECTIONS.includes(f.section) ? f.section : 'Other'); this.required.set(f.isRequired);
          this.sensitive.set(f.isSensitive); this.editable.set(f.employeeEditable); this.active.set(f.isActive);
        }
      } catch (e) { this.error.set(errorText(e, 'Could not load this field.')); }
    }
    this.loading.set(false);
  }

  setType(t: CustomFieldType) { if (!this.id()) this.type.set(t); }
  addOption(v: string) {
    const o = v.trim(); if (!o) return;
    if (!this.options().some(x => x.toLowerCase() === o.toLowerCase())) this.options.update(x => [...x, o]);
  }
  removeOption(o: string) { this.options.update(x => x.filter(y => y !== o)); }

  async save() {
    this.tried.set(true);
    const needsOptions = this.type() === 'Select' || this.type() === 'MultiSelect';
    if (!this.name().trim() || (needsOptions && !this.options().length)) return;
    const body = {
      name: this.name().trim(), fieldType: this.type(), options: needsOptions ? this.options() : [],
      isRequired: this.required(), isSensitive: this.sensitive(), employeeEditable: this.editable(),
      section: this.section(), sortOrder: this.field()?.sortOrder ?? 0, isActive: this.active(),
    };
    this.busy.set(true); this.error.set(null);
    try {
      if (this.field()) await firstValueFrom(this.svc.update('custom-fields', this.field()!.id, body));
      else await firstValueFrom(this.svc.create('custom-fields', body));
      this.toast.show(this.field() ? `${body.name} saved.` : `${body.name} added. It now shows on every profile.`);
      await this.router.navigate(['/more/settings/custom-fields']);
    } catch (e) { this.error.set(errorText(e, 'Could not save this field.')); }
    finally { this.busy.set(false); }
  }

  async remove() {
    const f = this.field(); if (!f) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.svc.remove('custom-fields', f.id));
      this.toast.show(`${f.name} deleted.`);
      await this.router.navigate(['/more/settings/custom-fields']);
    } catch (e) { this.error.set(errorText(e, 'Could not delete this field.')); }
    finally { this.busy.set(false); }
  }
}
