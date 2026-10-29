import { SkeletonComponent } from '../../../shared/skeleton.component';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideArrowLeft, LucideLock } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { ChangeEntry, DirectoryEntry, JobRecord } from '../../../core/models/people.models';
import { CareerTimelineComponent, fmtDay } from '../career-timeline.component';
import { errorText } from '../people-errors';

interface Batch { id: string; at: string; by: string; source: string; rows: ChangeEntry[]; }

/** Everything that happened to a profile: career steps, and every saved change with who and when. */
@Component({
  standalone: true,
  imports: [SkeletonComponent, CareerTimelineComponent, LucideArrowLeft, LucideLock],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full">
      <header class="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div class="h-14 px-1 flex items-center gap-1">
          <button type="button" (click)="back()" aria-label="Back" class="w-11 h-11 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></button>
          <div class="min-w-0 flex flex-col">
            <h1 class="m-0 text-[18px] font-bold leading-tight">History</h1>
            @if (person()) { <span class="text-[13px] text-slate-600 truncate">{{ person()!.fullName }}</span> }
          </div>
        </div>
        <div class="px-4 pb-3">
          <div role="tablist" aria-label="View" class="grid grid-cols-2 p-1 rounded-12 bg-slate-100">
            <button type="button" role="tab" [attr.aria-selected]="tab() === 'career'" (click)="tab.set('career')" class="h-10 rounded-10 border-0 text-[14px] cursor-pointer" [class.on]="tab() === 'career'" [class.off]="tab() !== 'career'">Career</button>
            <button type="button" role="tab" [attr.aria-selected]="tab() === 'changes'" (click)="tab.set('changes')" class="h-10 rounded-10 border-0 text-[14px] cursor-pointer" [class.on]="tab() === 'changes'" [class.off]="tab() !== 'changes'">All changes</button>
          </div>
        </div>
      </header>

      <div class="p-4">
        @if (loading()) { <ws-skeleton [rows]="5" /> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else if (tab() === 'career') {
          @if (steps().length) {
            <section class="ws-card"><ws-career-timeline [steps]="steps()" [detailed]="true" /></section>
          } @else { <p class="m-0 text-[14px] text-slate-600">No career steps yet.</p> }
        } @else {
          @if (!batches().length) { <p class="m-0 text-[14px] text-slate-600">No changes recorded yet.</p> }
          <ol class="list-none m-0 p-0 flex flex-col gap-3">
            @for (b of batches(); track b.id) {
              <li class="ws-card !gap-2">
                <p class="m-0 text-[13px] text-slate-600"><span class="font-semibold text-slate-900">{{ b.by }}</span>
                  {{ b.source === 'Self' ? 'updated their own profile' : b.source === 'System' ? '(automatic)' : '' }} · {{ when(b.at) }}</p>
                <ul class="list-none m-0 p-0 flex flex-col gap-1.5">
                  @for (r of b.rows; track r.id) {
                    <li class="text-[14px] leading-snug">
                      <span class="font-semibold">{{ r.label }}</span>
                      @if (r.isSensitive) { <svg lucideLock [size]="12" class="inline ml-1 text-slate-500 align-[-1px]" aria-label="Private"></svg> }
                      <span class="text-slate-600 mr-1">:</span>
                      @if (r.oldValue && r.newValue) { <span class="text-slate-600 line-through decoration-slate-400">{{ r.oldValue }}</span><span class="mx-1 text-slate-500" aria-label="changed to">→</span><span>{{ r.newValue }}</span> }
                      @else if (r.newValue) { <span>{{ r.newValue }}</span> <span class="text-slate-600">(added)</span> }
                      @else { <span class="text-slate-600 line-through decoration-slate-400">{{ r.oldValue }}</span> <span class="text-slate-600">(cleared)</span> }
                    </li>
                  }
                </ul>
              </li>
            }
          </ol>
          @if (total() > changes().length) {
            <div class="pt-3 flex justify-center">
              <button type="button" (click)="more()" [disabled]="loadingMore()" class="h-11 px-5 rounded-12 bg-white border border-slate-300 text-[14px] font-semibold cursor-pointer">{{ loadingMore() ? 'Loading…' : 'Show older changes' }}</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`.ws-card { padding:14px 16px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; display:flex; flex-direction:column; gap:10px; }
    .ws-alert { padding:12px 14px; border-radius:12px; background:#fef2f2; border:1px solid #fee2e2; color:#b91c1c; font-size:14px; }
    .on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,.08); } .off { background:transparent; color:#475569; font-weight:500; }`],
})
export class HistoryPage {
  readonly id = input.required<string>();
  private readonly people = inject(PeopleService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly tab = signal<'career' | 'changes'>('career');
  readonly loading = signal(true); readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly person = signal<DirectoryEntry | null>(null);
  readonly steps = signal<JobRecord[]>([]);
  readonly changes = signal<ChangeEntry[]>([]);
  readonly total = signal(0);
  private page = 1;

  /** One card per save: rows that share a batch. */
  readonly batches = computed<Batch[]>(() => {
    const out: Batch[] = [];
    for (const c of this.changes()) {
      const last = out[out.length - 1];
      if (last && last.id === c.batchId) last.rows.push(c);
      else out.push({ id: c.batchId, at: c.changedAt, by: c.changedByName, source: c.source, rows: [c] });
    }
    return out;
  });

  constructor() { effect(() => { const id = this.id(); untracked(() => void this.load(id)); }); }

  private async load(id: string) {
    this.loading.set(true); this.error.set(null); this.page = 1;
    try {
      const [card, steps, changes] = await Promise.all([
        firstValueFrom(this.people.card(id).pipe(catchError(() => of(null)))),
        firstValueFrom(this.people.timeline(id)),
        firstValueFrom(this.people.history(id, 1, 50)),
      ]);
      this.person.set(card); this.steps.set(steps); this.changes.set(changes.items); this.total.set(changes.totalCount);
    } catch (e) { this.error.set(errorText(e, 'You cannot see this history.')); }
    finally { this.loading.set(false); }
  }

  async more() {
    this.loadingMore.set(true);
    try {
      const r = await firstValueFrom(this.people.history(this.id(), this.page + 1, 50));
      this.page++; this.changes.update(c => [...c, ...r.items]); this.total.set(r.totalCount);
    } finally { this.loadingMore.set(false); }
  }

  when(iso: string) {
    const d = new Date(iso);
    return `${fmtDay(iso)}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
  }
  back() { if (history.length > 1) this.location.back(); else void this.router.navigate(['/people', this.id()]); }
}
