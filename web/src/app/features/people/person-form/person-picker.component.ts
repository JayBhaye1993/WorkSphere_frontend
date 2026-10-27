import { Component, inject, input, model, signal } from '@angular/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PeopleService } from '../people.service';
import { DirectoryEntry } from '../../../core/models/people.models';
import { AvatarComponent } from '../../../shared/avatar.component';

export interface PickedPerson { id: string; fullName: string; designationName: string | null; }

/** Search-as-you-type person picker (manager, approver...). Works for companies of any size. */
@Component({
  selector: 'ws-person-picker',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    <div class="ws-field">
      <span>{{ label() }}</span>
      @if (value(); as p) {
        <div class="flex items-center gap-3 min-h-[52px] px-3 rounded-10 border border-slate-300 bg-white">
          <ws-avatar [name]="p.fullName" [size]="32" />
          <span class="flex-1 min-w-0 flex flex-col">
            <span class="text-[15px] font-semibold">{{ p.fullName }}</span>
            @if (p.designationName) { <span class="text-[12px] font-normal text-slate-600">{{ p.designationName }}</span> }
          </span>
          <button type="button" class="h-9 px-3 rounded-8 text-[14px] font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer" (click)="value.set(null); open.set(true)">Change</button>
        </div>
      } @else {
        <div class="relative">
          <input class="ws-input" type="search" [placeholder]="placeholder()" autocomplete="off" role="combobox"
                 [attr.aria-expanded]="open() && results().length > 0" aria-autocomplete="list"
                 (focus)="open.set(true); search$.next(q)" (input)="q = $any($event.target).value; search$.next(q)">
          @if (open() && results().length) {
            <ul role="listbox" class="absolute z-20 left-0 right-0 mt-1 list-none m-0 p-1 bg-white border border-slate-200 rounded-12 shadow-lg max-h-[288px] overflow-y-auto">
              @for (r of results(); track r.id) {
                <li role="option" aria-selected="false">
                  <button type="button" class="w-full flex items-center gap-3 min-h-[52px] px-2 rounded-8 hover:bg-slate-50 text-left cursor-pointer bg-transparent border-0"
                          (click)="pick(r)">
                    <ws-avatar [name]="r.fullName" [size]="32" />
                    <span class="flex flex-col"><span class="text-[15px] font-semibold text-slate-900">{{ r.fullName }}</span>
                      <span class="text-[12px] font-normal text-slate-600">{{ r.designationName }}</span></span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
        @if (hint()) { <span class="hint">{{ hint() }}</span> }
      }
    </div>
  `,
})
export class PersonPickerComponent {
  private readonly people = inject(PeopleService);
  readonly label = input('Reports to');
  readonly placeholder = input('Search by name or title');
  readonly hint = input<string | null>(null);
  readonly excludeId = input<string | null>(null);
  readonly value = model<PickedPerson | null>(null);

  readonly open = signal(false);
  readonly results = signal<DirectoryEntry[]>([]);
  q = '';
  readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(200),
      switchMap(q => this.people.directory({ search: q, pageSize: 8 }).pipe(catchError(() => of(null)))),
      takeUntilDestroyed(),
    ).subscribe(r => this.results.set((r?.items ?? []).filter(p => p.id !== this.excludeId())));
  }

  pick(r: DirectoryEntry) {
    this.value.set({ id: r.id, fullName: r.fullName, designationName: r.designationName });
    this.open.set(false); this.q = '';
  }
}
