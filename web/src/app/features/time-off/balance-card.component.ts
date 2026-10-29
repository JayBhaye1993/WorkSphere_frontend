import { Component, computed, input } from '@angular/core';
import { LeaveBalance } from './time-off.models';
import { num } from './time-off-format';

/** One leave type's balance: what's left in large type, and how it adds up underneath. */
@Component({
  selector: 'ws-balance-card',
  standalone: true,
  template: `
    @let x = b();
    <div class="h-full p-3.5 rounded-14 bg-white border border-slate-200 flex flex-col gap-2" [style.border-top]="'4px solid ' + x.color">
      <span class="text-[13px] font-semibold text-slate-700 leading-tight">{{ x.name }}</span>
      @if (x.unlimited) {
        <span class="flex items-baseline gap-1"><span class="text-[26px] font-bold leading-none">{{ n(x.used + x.pending) }}</span><span class="text-[13px] text-slate-600">taken</span></span>
        <span class="text-[12px] text-slate-600">No limit@if (!x.isPaid) { · unpaid }</span>
      } @else {
        <span class="flex items-baseline gap-1"><span class="text-[26px] font-bold leading-none" [class.text-rose-700]="(x.available ?? 0) <= 0">{{ n(x.available) }}</span><span class="text-[13px] text-slate-600">left</span></span>
        @if (total() > 0) {
          <span class="h-1.5 rounded-full bg-slate-100 overflow-hidden flex" aria-hidden="true">
            <span class="h-full" [style.width.%]="pct(x.used)" [style.background]="x.color"></span>
            <span class="h-full opacity-40" [style.width.%]="pct(x.pending)" [style.background]="x.color"></span>
          </span>
        }
        <span class="text-[12px] text-slate-600 leading-snug">{{ detail() }}</span>
      }
    </div>
  `,
})
export class BalanceCardComponent {
  readonly b = input.required<LeaveBalance>();
  readonly total = computed(() => { const x = this.b(); return x.accrued + x.carried + x.adjusted; });
  readonly detail = computed(() => {
    const x = this.b(); const parts: string[] = [];
    parts.push(x.accrual === 'Monthly' ? `${num(x.accrued)} of ${num(x.yearlyAllowance)} earned so far` : `of ${num(x.accrued + x.carried + x.adjusted)}`);
    if (x.carried) parts.push(`${num(x.carried)} carried over`);
    if (x.adjusted) parts.push(`${x.adjusted > 0 ? '+' : ''}${num(x.adjusted)} by HR`);
    if (x.used) parts.push(`${num(x.used)} used`);
    if (x.pending) parts.push(`${num(x.pending)} pending`);
    return parts.join(' · ');
  });
  n(v: number | null) { return num(v); }
  pct(v: number) { const t = this.total(); return t > 0 ? Math.min(100, (v / t) * 100) : 0; }
}
