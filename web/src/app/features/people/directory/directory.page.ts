import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { LucideChevronRight, LucideSearch, LucideUserPlus, LucideX } from '@lucide/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { PeopleService } from '../people.service';
import { Department, DirectoryEntry } from '../../../core/models/people.models';
import { AvatarComponent } from '../../../shared/avatar.component';
import { errorText } from '../people-errors';

interface Chip { id: string | null; name: string; count: number | null; }
const PAGE = 30;

@Component({
  selector: 'ws-people-directory',
  standalone: true,
  imports: [RouterLink, AvatarComponent, LucideSearch, LucideChevronRight, LucideX, LucideUserPlus],
  template: `
    <div class="mx-auto max-w-[760px]">
      <header class="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 pt-5 pb-3 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <h1 class="m-0 text-[26px] font-bold tracking-tight">People
            @if (allTotal() !== null) { <span class="mono text-[16px] font-medium text-slate-600">{{ allTotal() }}</span> }
          </h1>
          @if (canAdd) {
            <a routerLink="/people/new" class="h-10 px-3.5 rounded-10 bg-indigo-600 text-white text-[14px] font-semibold flex items-center gap-1.5 hover:bg-indigo-700">
              <svg lucideUserPlus [size]="18" aria-hidden="true"></svg>Add person</a>
          }
        </div>
        <label class="flex items-center gap-2 h-11 px-3 rounded-12 border border-slate-300 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100">
          <svg lucideSearch [size]="18" class="text-slate-600 shrink-0" aria-hidden="true"></svg>
          <span class="sr-only">Search people</span>
          <input #box type="search" [value]="searchText()" (input)="typed(box.value)" placeholder="Name, title, skill or code"
                 autocomplete="off" enterkeyhint="search" class="flex-1 min-w-0 border-0 outline-none bg-transparent text-[16px] text-slate-900">
          @if (searchText()) {
            <button type="button" (click)="box.value=''; typed('')" aria-label="Clear search"
                    class="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 cursor-pointer">
              <svg lucideX [size]="16" aria-hidden="true"></svg>
            </button>
          }
        </label>
        @if (chips().length > 1) {
          <div role="group" aria-label="Filter by team" class="chips flex gap-2 overflow-x-auto -mx-4 px-4">
            @for (c of chips(); track c.id) {
              <button type="button" (click)="pick(c.id)" [attr.aria-pressed]="dept() === c.id"
                      class="chip" [class.chip-on]="dept() === c.id">
                {{ c.name }}@if (c.count !== null) {<span class="sr-only">, </span><span class="mono ml-1.5 opacity-80">{{ c.count }}</span>}
              </button>
            }
          </div>
        }
      </header>

      @if (loading()) {
        <ul class="list-none m-0 p-0 bg-white" aria-label="Loading people">
          @for (i of [1,2,3,4,5,6]; track i) {
            <li class="flex items-center gap-3 h-16 px-4 border-b border-slate-100">
              <span class="w-10 h-10 rounded-full bg-slate-100 animate-pulse"></span>
              <span class="flex-1 flex flex-col gap-2"><span class="h-3 w-40 rounded bg-slate-100 animate-pulse"></span><span class="h-3 w-56 rounded bg-slate-100 animate-pulse"></span></span>
            </li>
          }
        </ul>
      } @else if (error()) {
        <div role="alert" class="m-4 p-4 rounded-14 bg-red-50 border border-red-100 flex flex-col gap-3">
          <p class="m-0 text-[15px] text-red-600 font-medium">{{ error() }}</p>
          <button type="button" (click)="reload$.next()" class="self-start h-10 px-4 rounded-10 bg-white border border-slate-300 text-[14px] font-semibold cursor-pointer">Try again</button>
        </div>
      } @else {
        <p class="mx-4 mt-3 mb-2 text-[13px] text-slate-600" aria-live="polite">{{ summary() }}</p>
        @if (items().length === 0) {
          <div class="mx-4 p-6 rounded-14 bg-white border border-slate-200 text-center flex flex-col gap-2 items-center">
            <p class="m-0 text-[15px] font-semibold">No one matches “{{ searchText() }}”</p>
            <p class="m-0 text-[13px] text-slate-600">Try a first name, a job title or a skill.</p>
          </div>
        } @else {
          <ul class="list-none m-0 p-0 bg-white border-y border-slate-200">
            @for (p of items(); track p.id) {
              <li class="border-b border-slate-100 last:border-b-0">
                <a [routerLink]="['/people', p.id]" class="row">
                  <ws-avatar [name]="p.fullName" [photo]="p.profilePhotoUrl" />
                  <span class="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span class="text-[15px] font-semibold text-slate-900">{{ p.fullName }}</span>
                    <span class="text-[13px] text-slate-600 truncate">{{ line(p) }}</span>
                  </span>
                  <svg lucideChevronRight [size]="16" class="text-slate-400 shrink-0" aria-hidden="true"></svg>
                </a>
              </li>
            }
          </ul>
          @if (items().length < total()) {
            <div class="p-4 flex justify-center">
              <button type="button" (click)="more()" [disabled]="loadingMore()"
                      class="h-11 px-5 rounded-12 bg-white border border-slate-300 text-[14px] font-semibold cursor-pointer disabled:opacity-60">
                {{ loadingMore() ? 'Loading…' : 'Show more (' + (total() - items().length) + ' left)' }}
              </button>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    input[type=search]::-webkit-search-cancel-button { -webkit-appearance: none; display: none; }   /* our own clear button */
    .chips { scrollbar-width: none; } .chips::-webkit-scrollbar { display: none; }
    .chip { height:36px; padding:0 14px; border-radius:999px; font-size:14px; white-space:nowrap; flex-shrink:0; cursor:pointer;
      border:1px solid #cbd5e1; background:#fff; color:#334155; font-weight:500; }
    .chip-on { border-color:#4f46e5; background:#4f46e5; color:#fff; font-weight:600; }
    .chip:focus-visible, .row:focus-visible { outline:2px solid #4f46e5; outline-offset:2px; }
    .row { display:flex; align-items:center; gap:12px; min-height:64px; padding:8px 16px; color:inherit; text-decoration:none; }
    .row:hover { background:#f8fafc; }
  `],
})
export class DirectoryPage {
  private readonly people = inject(PeopleService);
  private readonly destroyRef = inject(DestroyRef);
  readonly canAdd = inject(AuthService).can('employees.create');

  readonly searchText = signal('');
  readonly dept = signal<string | null>(null);
  readonly items = signal<DirectoryEntry[]>([]);
  readonly total = signal(0);
  readonly allTotal = signal<number | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  private readonly departments = signal<Department[]>([]);
  private page = 1;

  readonly reload$ = new Subject<void>();
  private readonly typing$ = new Subject<string>();

  /** "All" plus top-level teams that have people, biggest first; counts include sub-teams. */
  readonly chips = computed<Chip[]>(() => [
    { id: null, name: 'All', count: this.allTotal() },
    ...this.departments()
      .filter(d => !d.parentDepartmentId && d.teamEmployeeCount > 0)
      .sort((a, b) => b.teamEmployeeCount - a.teamEmployeeCount || a.name.localeCompare(b.name))
      .map(d => ({ id: d.id, name: d.name, count: d.teamEmployeeCount })),
  ]);

  readonly summary = computed(() => {
    const n = this.total();
    const people = n === 1 ? '1 person' : `${n} people`;
    const team = this.departments().find(d => d.id === this.dept())?.name;
    if (this.searchText()) return `${people} matching “${this.searchText()}”${team ? ' in ' + team : ''}`;
    return team ? `${people} in ${team}` : people;
  });

  constructor() {
    this.typing$.pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload$.next());
    this.reload$.pipe(
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap(() => this.people.directory({ search: this.searchText(), departmentId: this.dept(), page: 1, pageSize: PAGE })
        .pipe(catchError(e => { this.error.set(errorText(e, 'Could not load people. Please try again.')); return of(null); }))),
      takeUntilDestroyed(),
    ).subscribe(r => {
      this.loading.set(false);
      if (!r) return;
      this.items.set(r.items); this.total.set(r.totalCount); this.page = 1;
      if (!this.searchText() && !this.dept()) this.allTotal.set(r.totalCount);
    });
    this.people.departments().pipe(catchError(() => of([] as Department[])), takeUntilDestroyed())
      .subscribe(d => this.departments.set(d));
    this.reload$.next();
  }

  typed(v: string) { this.searchText.set(v); this.typing$.next(v.trim()); }
  pick(id: string | null) { if (this.dept() !== id) { this.dept.set(id); this.reload$.next(); } }

  more() {
    this.loadingMore.set(true);
    this.people.directory({ search: this.searchText(), departmentId: this.dept(), page: this.page + 1, pageSize: PAGE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: r => { this.page++; this.items.update(x => [...x, ...r.items]); this.total.set(r.totalCount); this.loadingMore.set(false); },
        error: () => this.loadingMore.set(false),
      });
  }

  line(p: DirectoryEntry) {
    return [p.designationName, p.locationName].filter(Boolean).join(' · ') || p.email;
  }
}
