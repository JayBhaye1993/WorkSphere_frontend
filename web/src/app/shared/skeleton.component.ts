import { Component, input } from '@angular/core';

/** Grey placeholder shapes while a page loads, shaped like what's coming (a list, cards or a form). */
@Component({
  selector: 'ws-skeleton',
  standalone: true,
  host: { 'aria-busy': 'true', 'aria-label': 'Loading', role: 'status' },
  template: `
    @switch (kind()) {
      @case ('cards') {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">@for (i of rowsArr(); track i) { <div class="h-[96px] rounded-14 bg-slate-100 animate-pulse"></div> }</div>
      }
      @case ('form') {
        <div class="flex flex-col gap-5">
          @for (i of rowsArr(); track i) { <div class="flex flex-col gap-2"><div class="h-3.5 w-28 rounded bg-slate-100 animate-pulse"></div><div class="h-[46px] rounded-10 bg-slate-100 animate-pulse"></div></div> }
        </div>
      }
      @default {
        <div class="rounded-14 bg-white border border-slate-200 overflow-hidden">
          @for (i of rowsArr(); track i) {
            <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
              <div class="w-9 h-9 rounded-full bg-slate-100 animate-pulse shrink-0"></div>
              <div class="flex-1 flex flex-col gap-2"><div class="h-3.5 rounded bg-slate-100 animate-pulse" [style.width.%]="60 - (i % 3) * 12"></div><div class="h-3 w-1/3 rounded bg-slate-100 animate-pulse"></div></div>
            </div>
          }
        </div>
      }
    }
  `,
})
export class SkeletonComponent {
  readonly kind = input<'list' | 'cards' | 'form'>('list');
  readonly rows = input(5);
  rowsArr() { return Array.from({ length: this.rows() }, (_, i) => i); }
}
