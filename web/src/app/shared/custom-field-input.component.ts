import { Component, computed, input, model } from '@angular/core';
import { CustomField } from '../core/models/people.models';

/** One company-defined field, drawn by its type. The value is two-way bound with [(value)]. */
@Component({
  selector: 'ws-custom-field-input',
  standalone: true,
  template: `
    @switch (field().fieldType) {
      @case ('MultiSelect') {
        <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
          <legend class="p-0 mb-2 text-[14px] font-semibold">{{ field().name }}@if (field().isRequired) { <span class="text-red-600">*</span> }</legend>
          <div class="flex flex-wrap gap-2">
            @for (o of field().options; track o) {
              <button type="button" class="ws-pill" [attr.aria-pressed]="chosen().includes(o)" (click)="toggle(o)">{{ o }}</button>
            }
          </div>
          @if (error()) { <span class="text-[12px] font-medium text-red-600">{{ error() }}</span> }
        </fieldset>
      }
      @case ('Boolean') {
        <label class="flex items-center gap-3 min-h-[48px] cursor-pointer">
          <span class="flex-1 text-[14px] font-semibold">{{ field().name }}</span>
          <input type="checkbox" class="w-6 h-6 accent-indigo-600" [checked]="value() === true" (change)="value.set($any($event.target).checked)">
        </label>
      }
      @default {
        <label class="ws-field">
          <span>{{ field().name }}@if (field().isRequired) { <span class="text-red-600">*</span> }</span>
          @if (field().fieldType === 'Select') {
            <select class="ws-input" [value]="text()" (change)="setText($any($event.target).value)" [attr.aria-invalid]="!!error()">
              <option value="">Not set</option>
              @for (o of field().options; track o) { <option [value]="o" [selected]="o === text()">{{ o }}</option> }
            </select>
          } @else {
            <input class="ws-input" [type]="inputType()" [value]="text()" (input)="setText($any($event.target).value)"
                   [attr.inputmode]="field().fieldType === 'Number' ? 'decimal' : null" [attr.aria-invalid]="!!error()">
          }
          @if (error()) { <span class="err">{{ error() }}</span> }
        </label>
      }
    }
  `,
})
export class CustomFieldInputComponent {
  readonly field = input.required<CustomField>();
  readonly value = model<unknown>(null);
  readonly error = input<string | null>(null);

  readonly inputType = computed(() => ({ Number: 'number', Date: 'date' } as Record<string, string>)[this.field().fieldType] ?? 'text');
  readonly text = computed(() => this.value() === null || this.value() === undefined ? '' : String(this.value()));
  readonly chosen = computed(() => Array.isArray(this.value()) ? (this.value() as string[]) : []);

  setText(v: string) { this.value.set(v === '' ? null : v); }
  toggle(o: string) {
    const c = this.chosen();
    this.value.set(c.includes(o) ? c.filter(x => x !== o) : [...c, o]);
  }
}

/** True when a value counts as filled in. */
export function hasValue(v: unknown): boolean {
  return !(v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0));
}
