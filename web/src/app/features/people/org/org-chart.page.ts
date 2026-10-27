import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight, LucideMaximize, LucideSearch, LucideX, LucideZoomIn, LucideZoomOut } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { OrgPerson } from '../../../core/models/people.models';
import { AvatarComponent } from '../../../shared/avatar.component';
import { errorText } from '../people-errors';
import { OrgData, bandColor, teamLine } from './org-data';
import { OrgNodeComponent } from './org-node.component';

type View = 'focus' | 'tree';
const VIEW_KEY = 'ws_org_view';

/**
 * Who reports to whom. Focus view (default on phones): the chain above, the person, their direct reports.
 * Tree view (default on wide screens): the whole company, open/close branches, drag to move, zoom, fit.
 */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, OrgNodeComponent, LucideArrowLeft, LucideChevronRight, LucideSearch, LucideX, LucideZoomIn, LucideZoomOut, LucideMaximize],
  template: `
    <div [class]="view() === 'focus' ? 'h-full w-full flex flex-col mx-auto max-w-[720px]' : 'h-full w-full flex flex-col'">
      <header class="sticky top-0 z-20 bg-white border-b border-slate-200 px-1 pb-3 flex flex-col gap-2">
        <div class="h-14 flex items-center gap-1">
          <a routerLink="/people" aria-label="Back to people" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
          <h1 class="m-0 flex-1 text-[18px] font-bold">Org chart</h1>
          <div role="group" aria-label="View" class="mr-2 grid grid-cols-2 p-1 rounded-12 bg-slate-100">
            <button type="button" (click)="setView('focus')" [attr.aria-pressed]="view() === 'focus'" class="seg" [class.seg-on]="view() === 'focus'">Focus</button>
            <button type="button" (click)="setView('tree')" [attr.aria-pressed]="view() === 'tree'" class="seg" [class.seg-on]="view() === 'tree'">Tree</button>
          </div>
        </div>
        <div class="relative px-3">
          <label class="flex items-center gap-2 h-11 px-3 rounded-12 border border-slate-300 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100">
            <svg lucideSearch [size]="18" class="text-slate-600 shrink-0" aria-hidden="true"></svg>
            <span class="sr-only">Find someone</span>
            <input #q type="search" [value]="query()" (input)="query.set(q.value)" (keydown.enter)="pickFirst()" (keydown.escape)="query.set('')"
                   placeholder="Find someone by name, title or team" autocomplete="off" role="combobox" [attr.aria-expanded]="hits().length > 0" aria-controls="org-hits"
                   class="flex-1 min-w-0 border-0 outline-none bg-transparent text-[16px]">
            @if (query()) { <button type="button" (click)="query.set('')" aria-label="Clear search" class="w-9 h-9 -mr-2 flex items-center justify-center rounded-full bg-transparent border-0 text-slate-600 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="16" aria-hidden="true"></svg></button> }
          </label>
          @if (hits().length) {
            <ul id="org-hits" role="listbox" class="absolute left-3 right-3 top-12 z-30 list-none m-0 p-1 bg-white border border-slate-200 rounded-12 shadow-lg max-h-[60vh] overflow-y-auto">
              @for (h of hits(); track h.id) {
                <li role="option" [attr.aria-selected]="false">
                  <button type="button" (click)="pick(h.id)" class="w-full flex items-center gap-3 min-h-[52px] px-2 rounded-10 bg-transparent border-0 text-left cursor-pointer hover:bg-slate-50">
                    <ws-avatar [name]="h.fullName" [photo]="h.profilePhotoUrl" [size]="32" />
                    <span class="min-w-0 flex flex-col"><span class="text-[14px] font-semibold truncate">{{ h.fullName }}</span>
                      <span class="text-[12px] text-slate-600 truncate">{{ join(h.designationName, h.departmentName) }}</span></span>
                  </button>
                </li>
              }
            </ul>
          } @else if (query().trim() && data()) {
            <p class="absolute left-3 right-3 top-12 z-30 m-0 p-3 bg-white border border-slate-200 rounded-12 shadow-lg text-[14px] text-slate-600">No one matches “{{ query() }}”.</p>
          }
        </div>
      </header>

      @if (loading()) { <p class="p-4 text-[14px] text-slate-600">Loading the org chart…</p> }
      @else if (error()) { <div class="m-4 ws-alert" role="alert">{{ error() }}</div> }
      @else { @if (data(); as d) {
        @if (view() === 'focus') {
          @if (current(); as p) {
            <div class="p-4 flex flex-col gap-3">
              @if (chain().length) {
                <nav aria-label="Reports to" class="flex flex-col gap-1">
                  @for (c of chain(); track c.id; let last = $last) {
                    <button type="button" (click)="focusOn(c.id)" class="up" [style.margin-left.px]="$index * 10">
                      <ws-avatar [name]="c.fullName" [photo]="c.profilePhotoUrl" [size]="26" />
                      <span class="text-[13px] font-semibold text-slate-900 truncate">{{ c.fullName }}</span>
                      <span class="text-[12px] text-slate-600 truncate">{{ c.designationName }}</span>
                    </button>
                  }
                </nav>
              }
              <section class="me" [style.border-top-color]="band(p)" aria-live="polite">
                <ws-avatar [name]="p.fullName" [photo]="p.profilePhotoUrl" [size]="64" />
                <h2 class="m-0 mt-1 text-[20px] font-bold text-center">{{ p.fullName }}</h2>
                @if (p.designationName) { <p class="m-0 text-[14px] text-slate-700 text-center">{{ p.designationName }}</p> }
                <p class="m-0 text-[13px] text-slate-600 text-center">{{ join(p.departmentName, p.locationName) }}</p>
                @if (p.teamSize) { <p class="m-0 mt-1 text-[13px] font-semibold text-indigo-700">{{ line(p) }}</p> }
                <a [routerLink]="['/people', p.id]" class="mt-2 h-10 px-4 rounded-10 border border-slate-300 bg-white text-[14px] font-semibold text-slate-900 flex items-center no-underline hover:bg-slate-50">View profile</a>
              </section>

              @if (reports().length) {
                <h3 class="m-0 mt-1 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Direct reports · {{ reports().length }}</h3>
                <ul class="list-none m-0 p-0 flex flex-col gap-2">
                  @for (r of reports(); track r.id) {
                    <li><button type="button" (click)="focusOn(r.id)" class="down" [style.border-left-color]="band(r)">
                      <ws-avatar [name]="r.fullName" [photo]="r.profilePhotoUrl" [size]="40" />
                      <span class="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                        <span class="text-[15px] font-semibold text-slate-900 truncate">{{ r.fullName }}</span>
                        <span class="text-[13px] text-slate-600 truncate">{{ r.designationName || '—' }}</span>
                        @if (r.directReports) { <span class="text-[12px] font-semibold text-indigo-700">{{ line(r) }}</span> }
                      </span>
                      <svg lucideChevronRight [size]="16" class="text-slate-400 shrink-0" aria-hidden="true"></svg>
                    </button></li>
                  }
                </ul>
              } @else {
                <p class="m-0 px-1 text-[14px] text-slate-600">No one reports to {{ first(p) }}.</p>
              }

              @if (!p.managerId && others().length) {
                <h3 class="m-0 mt-3 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">No manager set · {{ others().length }}</h3>
                <p class="m-0 px-1 -mt-1 text-[13px] text-slate-600">These people don’t report to anyone yet. Set “Reports to” on their profile.</p>
                <ul class="list-none m-0 p-0 flex flex-col gap-2">
                  @for (r of others(); track r.id) {
                    <li><button type="button" (click)="focusOn(r.id)" class="down" [style.border-left-color]="band(r)">
                      <ws-avatar [name]="r.fullName" [photo]="r.profilePhotoUrl" [size]="40" />
                      <span class="flex-1 min-w-0 flex flex-col gap-0.5 text-left"><span class="text-[15px] font-semibold truncate">{{ r.fullName }}</span>
                        <span class="text-[13px] text-slate-600 truncate">{{ r.designationName || '—' }}</span></span>
                      <svg lucideChevronRight [size]="16" class="text-slate-400 shrink-0" aria-hidden="true"></svg>
                    </button></li>
                  }
                </ul>
              }
            </div>
          }
        } @else {
          <div class="relative flex-1 min-h-0">
            <div class="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
              <button type="button" (click)="zoomBy(0.15)" aria-label="Zoom in" class="zbtn"><svg lucideZoomIn [size]="18" aria-hidden="true"></svg></button>
              <button type="button" (click)="zoomBy(-0.15)" aria-label="Zoom out" class="zbtn"><svg lucideZoomOut [size]="18" aria-hidden="true"></svg></button>
              <button type="button" (click)="fit()" aria-label="Fit to screen" class="zbtn"><svg lucideMaximize [size]="18" aria-hidden="true"></svg></button>
            </div>
            <div #canvas class="canvas" (pointerdown)="panStart($event)" (pointermove)="panMove($event)" (pointerup)="panEnd()" (pointercancel)="panEnd()" (pointerleave)="panEnd()">
              <div #stage class="stage" [style.zoom]="zoom()">
                <div class="flex gap-10 items-start">
                  @for (r of d.roots; track r.id; let i = $index) {
                    @if (i === 1) { <div class="self-stretch w-px bg-slate-200" aria-hidden="true"></div> }
                    <div class="flex flex-col items-center gap-2">
                      @if (i === 1) { <span class="text-[12px] font-semibold text-slate-500 uppercase tracking-[.06em]">No manager set</span> }
                      <ws-org-node [person]="r" [data]="d" [open]="open()" [highlight]="highlight()" (toggle)="toggleOpen($event)" (openPerson)="openProfile($event)" />
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      } }
    </div>
  `,
  styles: [`
    :host { display:block; height:100%; }
    .seg { height:32px; padding:0 12px; border-radius:9px; border:0; font-size:13px; cursor:pointer; background:transparent; color:#475569; font-weight:500; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,.08); }
    .seg:focus-visible { outline:2px solid #4f46e5; outline-offset:1px; }
    .up { display:flex; align-items:center; gap:8px; min-height:44px; padding:4px 10px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; cursor:pointer; font:inherit; max-width:100%; text-align:left; }
    .up:hover { background:#f8fafc; }
    .me { display:flex; flex-direction:column; align-items:center; gap:2px; padding:18px 16px; background:#fff; border:1px solid #e2e8f0; border-top:5px solid; border-radius:16px; }
    .down { width:100%; display:flex; align-items:center; gap:12px; min-height:64px; padding:8px 12px; background:#fff; border:1px solid #e2e8f0; border-left:4px solid; border-radius:14px; cursor:pointer; font:inherit; }
    .down:hover { background:#f8fafc; }
    .up:focus-visible, .down:focus-visible, .zbtn:focus-visible { outline:2px solid #4f46e5; outline-offset:2px; }
    .canvas { position:absolute; inset:0; overflow:auto; cursor:grab; background:#f8fafc; touch-action:pan-x pan-y; }
    .canvas.dragging { cursor:grabbing; user-select:none; }
    .stage { display:inline-block; min-width:100%; padding:24px 64px 48px 24px; box-sizing:border-box; }
    .zbtn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid #cbd5e1; background:#fff; color:#334155; cursor:pointer; box-shadow:0 1px 2px rgba(15,23,42,.08); }
  `],
})
export class OrgChartPage {
  /** ?focus=<employee id> (bound from the query string). */
  readonly focus = input<string | undefined>(undefined);
  private readonly people = inject(PeopleService);
  private readonly router = inject(Router);
  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<OrgData | null>(null);
  readonly view = signal<View>(this.initialView());
  readonly focusId = signal<string | null>(null);
  readonly query = signal('');
  readonly open = signal<ReadonlySet<string>>(new Set());
  readonly highlight = signal<string | null>(null);
  readonly zoom = signal(1);

  readonly hits = computed(() => this.data()?.search(this.query()) ?? []);
  readonly current = computed(() => { const d = this.data(); return d ? d.byId.get(this.focusId() ?? '') ?? d.top ?? null : null; });
  readonly chain = computed(() => { const p = this.current(); return p ? this.data()!.chain(p.id) : []; });
  readonly reports = computed(() => { const p = this.current(); return p ? this.data()!.reports(p.id) : []; });
  /** At the top: everyone else without a manager. */
  readonly others = computed(() => { const d = this.data(); const p = this.current(); return d && p ? d.roots.filter(r => r.id !== p.id && r.id !== d.top?.id) : []; });

  constructor() {
    void this.load();
    effect(() => { const f = this.focus(); untracked(() => { if (f) { this.focusId.set(f); if (this.data()) this.reveal(f); } }); });
  }

  private initialView(): View {
    try { const v = localStorage.getItem(VIEW_KEY); if (v === 'focus' || v === 'tree') return v; } catch { /* storage unavailable */ }
    return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'tree' : 'focus';
  }

  private async load() {
    try {
      const d = new OrgData(await firstValueFrom(this.people.org()));
      this.data.set(d);
      // Start two levels deep.
      const open = new Set<string>(); for (const r of d.roots) { open.add(r.id); }
      if (d.top) for (const k of d.reports(d.top.id)) if (k.directReports) open.add(k.id);
      this.open.set(open);
      if (this.focusId()) this.reveal(this.focusId()!);
    } catch (e) { this.error.set(errorText(e, 'Could not load the org chart.')); }
    finally { this.loading.set(false); }
  }

  setView(v: View) { this.view.set(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } if (v === 'tree' && this.focusId()) this.reveal(this.focusId()!); }
  band(p: OrgPerson) { return bandColor(p.topDepartmentId); }
  line(p: OrgPerson) { return teamLine(p); }
  first(p: OrgPerson) { return p.fullName.split(' ')[0]; }
  join(...parts: (string | null | undefined)[]) { return parts.filter(Boolean).join(' · '); }

  focusOn(id: string) {
    this.focusId.set(id);
    void this.router.navigate([], { queryParams: { focus: id }, replaceUrl: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  pick(id: string) { this.query.set(''); this.focusOn(id); if (this.view() === 'tree') this.reveal(id); }
  pickFirst() { const h = this.hits()[0]; if (h) this.pick(h.id); }
  openProfile(id: string) { void this.router.navigate(['/people', id]); }

  toggleOpen(id: string) {
    const s = new Set(this.open()); if (s.has(id)) s.delete(id); else s.add(id); this.open.set(s);
  }

  /** Opens every branch above someone, highlights them and scrolls them into the middle. */
  private reveal(id: string) {
    const d = this.data(); if (!d) return;
    const s = new Set(this.open()); for (const c of d.chain(id)) s.add(c.id); this.open.set(s);
    this.highlight.set(id);
    setTimeout(() => document.getElementById('org-' + id)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }), 60);
    setTimeout(() => { if (this.highlight() === id) this.highlight.set(null); }, 4000);
  }

  zoomBy(step: number) { this.zoom.set(Math.min(1.6, Math.max(0.3, +(this.zoom() + step).toFixed(2)))); }
  fit() {
    const c = this.canvas()?.nativeElement; const st = this.stage()?.nativeElement; if (!c || !st) return;
    const natural = st.scrollWidth / this.zoom();
    this.zoom.set(Math.min(1, Math.max(0.3, +(c.clientWidth / natural).toFixed(2))));
    c.scrollTo({ left: 0, top: 0 });
  }

  // Drag the background to move around (mouse); touch screens scroll natively.
  private drag: { x: number; y: number; left: number; top: number } | null = null;
  panStart(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || (e.target as HTMLElement).closest('button')) return;
    const c = this.canvas()!.nativeElement;
    this.drag = { x: e.clientX, y: e.clientY, left: c.scrollLeft, top: c.scrollTop }; c.classList.add('dragging');
  }
  panMove(e: PointerEvent) {
    if (!this.drag) return; const c = this.canvas()!.nativeElement;
    c.scrollLeft = this.drag.left - (e.clientX - this.drag.x); c.scrollTop = this.drag.top - (e.clientY - this.drag.y);
  }
  panEnd() { this.drag = null; this.canvas()?.nativeElement.classList.remove('dragging'); }
}
