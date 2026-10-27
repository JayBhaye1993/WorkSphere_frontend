import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight, LucidePlus } from '@lucide/angular';
import { SettingsService } from './settings.service';
import { CustomField } from '../../core/models/people.models';
import { errorText } from '../people/people-errors';

export const TYPE_LABEL: Record<string, string> = { Text: 'Text', Number: 'Number', Date: 'Date', Select: 'Dropdown', MultiSelect: 'Multi-select', Boolean: 'Yes / No' };

/** The extra details the company keeps on every profile, grouped by section. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucidePlus, LucideChevronRight],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to company settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Custom fields</h1>
        <a routerLink="/more/settings/custom-fields/new" class="mr-2 h-10 px-3.5 rounded-10 bg-indigo-600 text-white text-[14px] font-semibold flex items-center gap-1.5 hover:bg-indigo-700"><svg lucidePlus [size]="18" aria-hidden="true"></svg>Add</a>
      </header>
      <div class="p-4 flex flex-col gap-4">
        <p class="m-0 px-1 text-[13px] leading-relaxed text-slate-600">Extra details you keep on every profile, such as skills, a laptop tag or blood group. They appear on Add person and on profiles automatically.</p>
        @if (loading()) {
          @for (i of [1,2]; track i) { <div class="h-[72px] rounded-14 bg-white border border-slate-200 animate-pulse"></div> }
        } @else if (error()) {
          <div class="ws-alert" role="alert">{{ error() }}</div>
        } @else if (!fields().length) {
          <div class="p-6 rounded-14 bg-white border border-slate-200 text-center text-[14px] text-slate-600">No custom fields yet. Tap Add to create one.</div>
        } @else {
          @for (g of groups(); track g.section) {
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">{{ g.section }}</h2>
              <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
                @for (f of g.items; track f.id) {
                  <li class="border-b border-slate-100 last:border-b-0">
                    <a [routerLink]="['/more/settings/custom-fields', f.id]" class="flex items-center gap-3 min-h-[64px] px-4 py-2 text-slate-900 no-underline hover:bg-slate-50" [class.opacity-60]="!f.isActive">
                      <span class="flex-1 min-w-0 flex flex-col gap-1">
                        <span class="text-[15px] font-semibold">{{ f.name }}</span>
                        <span class="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
                          {{ typeLabel[f.fieldType] }} · {{ f.employeeCount === 1 ? '1 person' : f.employeeCount + ' people' }}
                          @if (f.isRequired) { <span class="flag">Required</span> }
                          @if (f.isSensitive) { <span class="flag">Private</span> }
                          @if (f.employeeEditable) { <span class="flag">Employee can edit</span> }
                          @if (!f.isActive) { <span class="flag">Not in use</span> }
                        </span>
                      </span>
                      <svg lucideChevronRight [size]="16" class="text-slate-400" aria-hidden="true"></svg>
                    </a>
                  </li>
                }
              </ul>
            </section>
          }
        }
      </div>
    </div>
  `,
  styles: [`.flag { padding:1px 8px; border-radius:999px; background:#f1f5f9; color:#334155; font-weight:600; }`],
})
export class CustomFieldsPage {
  private readonly svc = inject(SettingsService);
  readonly typeLabel = TYPE_LABEL;
  readonly fields = signal<CustomField[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly groups = computed(() => {
    const by = new Map<string, CustomField[]>();
    for (const f of this.fields()) by.set(f.section, [...(by.get(f.section) ?? []), f]);
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([section, items]) => ({ section, items: items.sort((x, y) => Number(y.isActive) - Number(x.isActive) || x.sortOrder - y.sortOrder || x.name.localeCompare(y.name)) }));
  });
  constructor() {
    firstValueFrom(this.svc.list<CustomField>('custom-fields', { includeInactive: true }))
      .then(f => this.fields.set(f)).catch(e => this.error.set(errorText(e, 'Could not load custom fields.')))
      .finally(() => this.loading.set(false));
  }
}
