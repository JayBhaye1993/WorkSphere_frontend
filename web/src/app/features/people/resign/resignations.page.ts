import { SkeletonComponent } from '../../../shared/skeleton.component';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { PendingResignation } from '../../../core/models/people.models';
import { AvatarComponent } from '../../../shared/avatar.component';
import { errorText } from '../people-errors';
import { daysBetween, fmtDay } from '../exit/exit-dates';

/** Resignations waiting for the viewer's decision (HR: everyone; managers: their reporting line). */
@Component({
  standalone: true,
  imports: [SkeletonComponent, RouterLink, AvatarComponent, LucideArrowLeft, LucideChevronRight],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/people" aria-label="Back to people" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 text-[18px] font-bold">Resignations</h1>
      </header>
      <div class="p-4 flex flex-col gap-2.5">
        @if (loading()) { <ws-skeleton [rows]="5" /> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (!items().length) { <div class="p-6 rounded-14 bg-white border border-slate-200 text-center text-[14px] text-slate-600">No resignations are waiting for you.</div> }
        @else {
          <p class="m-0 px-1 text-[13px] text-slate-600">Open one to accept it (and agree the last day) or decline it with a reason.</p>
          <ul class="list-none m-0 p-0 flex flex-col gap-2.5">
            @for (r of items(); track r.employeeId) {
              <li><a [routerLink]="['/people', r.employeeId]" class="flex items-start gap-3 p-3 rounded-14 bg-white border border-slate-200 border-l-4 !border-l-amber-500 text-slate-900 no-underline hover:bg-slate-50">
                <ws-avatar [name]="r.fullName" [size]="40" />
                <span class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span class="text-[15px] font-semibold">{{ r.fullName }}</span>
                  @if (r.designationName) { <span class="text-[13px] text-slate-600">{{ r.designationName }}</span> }
                  <span class="text-[13px] text-slate-700">Resigned {{ day(r.submittedAt) }} · wants to leave <b>{{ day(r.proposedLastDay) }}</b>
                    @if (r.noticePeriodDays && served(r) < r.noticePeriodDays) { <span class="text-amber-800"> ({{ r.noticePeriodDays - served(r) }} days short of notice)</span> }</span>
                  @if (r.reasonName) { <span class="text-[12px] text-slate-600">{{ r.reasonName }}</span> }
                  @if (r.employeeNote) { <span class="text-[13px] text-slate-700">“{{ r.employeeNote }}”</span> }
                </span>
                <svg lucideChevronRight [size]="16" class="text-slate-400 shrink-0 mt-3" aria-hidden="true"></svg>
              </a></li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class ResignationsPage {
  private readonly people = inject(PeopleService);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly items = signal<PendingResignation[]>([]);
  constructor() {
    firstValueFrom(this.people.pendingResignations())
      .then(x => this.items.set(x)).catch(e => this.error.set(errorText(e, 'Could not load resignations.'))).finally(() => this.loading.set(false));
  }
  day(d: string) { return fmtDay(d); }
  served(r: PendingResignation) { return daysBetween(r.submittedAt.slice(0, 10), r.proposedLastDay); }
}
