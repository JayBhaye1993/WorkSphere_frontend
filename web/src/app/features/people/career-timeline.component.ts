import { Component, computed, input } from '@angular/core';
import { JobRecord } from '../../core/models/people.models';

const TONE: Record<string, [string, string]> = {
  Joined: ['#eef2ff', '#3730a3'], Promotion: ['#dcfce7', '#166534'], Transfer: ['#e0f2fe', '#075985'],
  'Manager change': ['#f1f5f9', '#334155'], 'Role change': ['#f1f5f9', '#334155'], Relocation: ['#f1f5f9', '#334155'],
  Correction: ['#fef3c7', '#92400e'], Exit: ['#fee2e2', '#991b1b'],
};

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Career steps as a vertical timeline (newest first): kind, effective date, where they stood, note, who recorded it. */
@Component({
  selector: 'ws-career-timeline',
  standalone: true,
  template: `
    <ol class="list-none m-0 p-0 flex flex-col">
      @for (s of shown(); track s.id; let last = $last) {
        <li class="relative pl-6 pb-4" [class.pb-0]="last">
          @if (!last) { <span aria-hidden="true" class="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200"></span> }
          <span aria-hidden="true" class="absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-[3px] border-white" [style.background]="tone(s.kind)[1]"></span>
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2 py-px rounded-full text-[12px] font-bold" [style.background]="tone(s.kind)[0]" [style.color]="tone(s.kind)[1]">{{ s.kind }}</span>
            <span class="text-[13px] font-semibold text-slate-700">{{ day(s.effectiveDate) }}</span>
          </div>
          @if (s.kind !== 'Exit') {
            <p class="m-0 mt-1 text-[14px] text-slate-900">{{ line1(s) }}</p>
            @if (line2(s)) { <p class="m-0 text-[13px] text-slate-600">{{ line2(s) }}</p> }
          }
          @if (s.note) { <p class="m-0 mt-1 text-[13px] text-slate-700">“{{ s.note }}”</p> }
          @if (detailed()) { <p class="m-0 mt-1 text-[12px] text-slate-600">Recorded by {{ s.recordedByName }} on {{ day(s.recordedAt) }}</p> }
        </li>
      }
    </ol>
  `,
})
export class CareerTimelineComponent {
  readonly steps = input.required<JobRecord[]>();
  readonly limit = input<number | null>(null);
  readonly detailed = input(false);
  readonly shown = computed(() => this.limit() ? this.steps().slice(0, this.limit()!) : this.steps());
  tone(kind: string) { return TONE[kind] ?? TONE['Role change']; }
  day(iso: string) { return fmtDay(iso); }
  line1(s: JobRecord) { return [s.designationName, s.departmentName].filter(Boolean).join(' · ') || 'No title set'; }
  line2(s: JobRecord) { return [s.managerName ? `Reports to ${s.managerName}` : null, s.gradeName, s.locationName, s.employmentTypeName].filter(Boolean).join(' · '); }
}
