import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronDown, LucideChevronRight, LucideChevronUp, LucidePlus } from '@lucide/angular';
import { TimeOffService } from '../time-off.service';
import { LeaveType } from '../time-off.models';
import { num } from '../time-off-format';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';

/** Settings › Time off types: the kinds of leave the company offers, in the order people see them. */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideChevronDown, LucideChevronRight, LucideChevronUp, LucidePlus],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Time off types</h1>
        <a routerLink="/more/settings/leave-types/new" aria-label="Add a type" class="w-11 h-11 mr-1 flex items-center justify-center rounded-full hover:bg-slate-100 text-indigo-700"><svg lucidePlus [size]="22" aria-hidden="true"></svg></a>
      </header>
      <div class="p-4 flex flex-col gap-3">
        <p class="m-0 px-1 text-[13px] text-slate-600">Balances are worked out from these rules, so a change applies to everyone straight away.</p>
        @if (loading()) { <p class="m-0 text-[14px] text-slate-600">Loading…</p> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else {
          <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
            @for (t of items(); track t.id; let i = $index, last = $last) {
              <li class="flex items-center gap-1 border-b border-slate-100 last:border-b-0">
                <a [routerLink]="['/more/settings/leave-types', t.id]" class="flex-1 min-w-0 flex items-center gap-3 min-h-[64px] pl-4 pr-2 text-slate-900 no-underline hover:bg-slate-50">
                  <span class="w-3 h-3 rounded-full shrink-0" [style.background]="t.color" aria-hidden="true"></span>
                  <span class="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span class="text-[15px] font-semibold">{{ t.name }}@if (!t.isActive) { <span class="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-semibold text-slate-600 align-middle">Off</span> }</span>
                    <span class="text-[12px] text-slate-600">{{ summary(t) }}</span>
                  </span>
                  <svg lucideChevronRight [size]="16" class="text-slate-400 shrink-0" aria-hidden="true"></svg>
                </a>
                <span class="flex flex-col pr-1">
                  <button type="button" (click)="move(i, -1)" [disabled]="i === 0" [attr.aria-label]="'Move ' + t.name + ' up'" class="w-9 h-8 flex items-center justify-center bg-transparent border-0 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><svg lucideChevronUp [size]="16" aria-hidden="true"></svg></button>
                  <button type="button" (click)="move(i, 1)" [disabled]="last" [attr.aria-label]="'Move ' + t.name + ' down'" class="w-9 h-8 flex items-center justify-center bg-transparent border-0 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><svg lucideChevronDown [size]="16" aria-hidden="true"></svg></button>
                </span>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class LeaveTypesPage {
  private readonly svc = inject(TimeOffService);
  private readonly toast = inject(ToastService);
  readonly items = signal<LeaveType[]>([]);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  constructor() {
    firstValueFrom(this.svc.types()).then(x => this.items.set(x))
      .catch(e => this.error.set(errorText(e, 'Could not load time off types.'))).finally(() => this.loading.set(false));
  }
  summary(t: LeaveType): string {
    const p = [t.daysPerYear === null ? 'No limit' : `${num(t.daysPerYear)} days a year${t.accrual === 'Monthly' ? ', built up monthly' : ''}`];
    if (!t.isPaid) p.push('unpaid');
    if (t.carryForwardMax > 0) p.push(`carry up to ${num(t.carryForwardMax)}`);
    if (t.employmentTypeIds.length) p.push('some employment types');
    return p.join(' · ');
  }
  async move(i: number, d: number) {
    const list = [...this.items()]; const j = i + d;
    [list[i], list[j]] = [list[j], list[i]];
    this.items.set(list);
    try { await firstValueFrom(this.svc.reorderTypes(list.map(t => t.id))); }
    catch (e) { this.toast.show(errorText(e, 'Could not save the order.'), 'error'); }
  }
}
