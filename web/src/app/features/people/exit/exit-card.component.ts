import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideCheck, LucideEllipsis, LucideLock, LucidePlus, LucideX } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { ExitCase, ExitTask, TASK_OWNERS } from '../../../core/models/people.models';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';
import { fmtDay } from './exit-dates';

type Sheet = { kind: 'complete' } | { kind: 'withdraw' } | { kind: 'add' } | { kind: 'task'; task: ExitTask } | { kind: 'accept' } | { kind: 'decline' } | null;

/**
 * A person's exit on their profile: dates, notice, reason, and the offboarding checklist.
 * HR (canManage) ticks items, adds one-off steps, completes or withdraws the exit;
 * the person and their managers see it read-only.
 */
@Component({
  selector: 'ws-exit-card',
  standalone: true,
  imports: [RouterLink, LucideCheck, LucideEllipsis, LucideLock, LucidePlus, LucideX],
  template: `
    @let x = exit();
    <section class="card" aria-labelledby="exit-h">
      <div class="flex items-center gap-2">
        <h2 id="exit-h" class="card-h flex-1" [class.!text-amber-800]="x.status === 'Requested'">{{ x.status === 'Requested' ? 'Resignation pending' : x.status === 'Completed' ? 'Exit' : 'Leaving' }}</h2>
        @if (x.canManage && x.status !== 'Requested') {
          <a [routerLink]="['/people', x.employeeId, 'exit']" class="text-[14px] font-semibold min-h-[44px] -my-3 flex items-center">{{ x.status === 'Completed' ? 'Edit details' : 'Change' }}</a>
        }
      </div>

      <dl class="facts">
        <dt>Type</dt><dd>{{ x.exitType }}</dd>
        <dt>{{ x.exitType === 'Resignation' ? 'Resigned on' : 'Notice given' }}</dt><dd>{{ day(x.noticeDate) }}</dd>
        @if (x.status === 'Requested') {
          <dt>Proposed last day</dt><dd class="font-semibold">{{ day(x.requestedLastDay ?? x.lastWorkingDay) }}</dd>
        } @else {
        <dt>{{ x.status === 'Completed' ? 'Left on' : 'Last day' }}</dt>
        <dd><span class="font-semibold">{{ day(x.lastWorkingDay) }}</span>
          @if (x.status === 'Serving') { <span class="text-slate-600"> · {{ x.daysLeft === 0 ? 'today' : x.daysLeft === 1 ? '1 day left' : x.daysLeft + ' days left' }}</span> }</dd>
        }
        @if (x.noticePeriodDays) {
          <dt>Notice</dt><dd>{{ x.noticePeriodDays }} days@if (x.shortenedByDays) { <span class="text-amber-800"> · shortened by {{ x.shortenedByDays }}</span> }</dd>
        }
        @if (x.reasonName) { <dt>Reason</dt><dd>{{ x.reasonName }}</dd> }
        @if (x.employeeNote) { <dt>In their words</dt><dd class="whitespace-pre-line">“{{ x.employeeNote }}”</dd> }
        @if (x.decidedByName && x.status !== 'Requested') { <dt>Accepted by</dt><dd>{{ x.decidedByName }}@if (x.decisionNote) { · “{{ x.decisionNote }}” }</dd> }
        @if (x.canManage && x.status !== 'Requested') {
          <dt>Rehire</dt><dd>{{ x.rehireEligible === true ? 'Yes' : x.rehireEligible === false ? 'No' : 'Not decided' }}</dd>
          @if (x.note) { <dt class="flex items-start gap-1"><svg lucideLock [size]="12" class="mt-1" aria-hidden="true"></svg>Note</dt><dd class="whitespace-pre-line">{{ x.note }}</dd> }
        }
      </dl>

      @if (x.tasks.length) {
        <div class="flex flex-col gap-1.5 pt-1">
          <div class="flex items-center justify-between text-[13px]">
            <span class="font-semibold text-slate-700">Checklist</span>
            <span class="text-slate-600">{{ x.tasksDone }} of {{ x.tasks.length }} done</span>
          </div>
          <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" [attr.aria-valuenow]="x.tasksDone" aria-valuemin="0" [attr.aria-valuemax]="x.tasks.length" aria-label="Checklist progress">
            <div class="h-full bg-emerald-600 transition-[width]" [style.width.%]="100 * x.tasksDone / x.tasks.length"></div>
          </div>
        </div>
      }
      <ul class="list-none m-0 p-0 flex flex-col">
        @for (t of x.tasks; track t.id) {
          <li class="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-b-0">
            @if (x.canManage) {
              <button type="button" (click)="toggle(t)" [disabled]="busy() === t.id" role="checkbox" [attr.aria-checked]="t.done" [attr.aria-label]="t.title"
                      class="tick" [class.tick-on]="t.done">@if (t.done) { <svg lucideCheck [size]="16" aria-hidden="true"></svg> }</button>
            } @else {
              <span class="tick !cursor-default" [class.tick-on]="t.done" role="img" [attr.aria-label]="t.done ? 'Done' : 'Not done'">@if (t.done) { <svg lucideCheck [size]="16" aria-hidden="true"></svg> }</span>
            }
            <div class="flex-1 min-w-0 pt-2.5 flex flex-col gap-0.5">
              <span class="text-[14px] leading-snug" [class.line-through]="t.done" [class.text-slate-500]="t.done">{{ t.title }}</span>
              <span class="text-[12px] text-slate-600"><span class="owner">{{ owner(t.owner) }}</span>@if (t.done) { · {{ t.doneByName }}, {{ day(t.doneAt!) }} }</span>
              @if (t.note) { <span class="text-[13px] text-slate-700">{{ t.note }}</span> }
            </div>
            @if (x.canManage) {
              <button type="button" (click)="open({ kind: 'task', task: t })" [attr.aria-label]="'More for ' + t.title" class="w-11 h-11 flex items-center justify-center rounded-full bg-transparent border-0 text-slate-600 hover:bg-slate-100 cursor-pointer"><svg lucideEllipsis [size]="18" aria-hidden="true"></svg></button>
            }
          </li>
        }
      </ul>

      @if (x.status === 'Requested' && x.canDecide) {
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button type="button" (click)="open({ kind: 'decline' })" class="ws-btn ws-btn-ghost !h-11">Decline</button>
          <button type="button" (click)="open({ kind: 'accept' })" class="ws-btn ws-btn-primary !h-11">Accept</button>
        </div>
      }
      @if (x.canManage && x.status !== 'Requested') {
        <button type="button" (click)="open({ kind: 'add' })" class="self-start min-h-[44px] -my-1 bg-transparent border-0 p-0 text-[14px] font-semibold text-indigo-700 flex items-center gap-1.5 cursor-pointer"><svg lucidePlus [size]="16" aria-hidden="true"></svg>Add a step</button>
        @if (x.status === 'Serving') {
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button type="button" (click)="open({ kind: 'withdraw' })" class="ws-btn ws-btn-ghost !h-11">Withdraw</button>
            <button type="button" (click)="open({ kind: 'complete' })" class="ws-btn !h-11 btn-danger">Complete now</button>
          </div>
        }
      }
      @if (x.status === 'Completed' && x.closedByName === 'System') {
        <p class="m-0 text-[12px] text-slate-600">Completed automatically after the last working day.</p>
      }
    </section>

    @if (sheet(); as s) {
      <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="close()" (keydown.escape)="close()">
        <section #dialog role="dialog" aria-modal="true" [attr.aria-label]="title()" tabindex="-1" (click)="$event.stopPropagation()"
                 class="w-full lg:max-w-[480px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4 outline-none">
          <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
          <div class="flex items-center gap-2">
            <h2 class="m-0 flex-1 text-[19px] font-bold">{{ title() }}</h2>
            <button type="button" (click)="close()" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
          </div>
          @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }

          @switch (s.kind) {
            @case ('complete') {
              <p class="m-0 text-[15px] leading-relaxed text-slate-700">{{ name() }} leaves today@if (x.daysLeft > 0) {, {{ x.daysLeft }} {{ x.daysLeft === 1 ? 'day' : 'days' }} before the planned last day}. Their login is switched off and open tasks are unassigned. This can’t be undone.</p>
              @if (open_() > 0) {
                <p class="m-0 p-3 rounded-10 bg-amber-50 text-[14px] text-amber-900">{{ open_() }} checklist {{ open_() === 1 ? 'step is' : 'steps are' }} still open. You can finish {{ open_() === 1 ? 'it' : 'them' }} afterwards.</p>
              }
              <fieldset class="m-0 p-0 border-0">
                <legend class="p-0 mb-2 text-[13px] font-semibold">Would you rehire {{ name() }}?</legend>
                <div class="grid grid-cols-3 p-1 rounded-12 bg-slate-100" role="group">
                  @for (o of rehireOptions; track o.label) {
                    <button type="button" (click)="rehire.set(o.value)" [attr.aria-pressed]="rehire() === o.value" class="seg" [class.seg-on]="rehire() === o.value">{{ o.label }}</button>
                  }
                </div>
              </fieldset>
              <button type="button" (click)="complete()" [disabled]="working()" class="ws-btn btn-danger">{{ working() ? 'Completing…' : 'Complete exit today' }}</button>
              <button type="button" (click)="close()" class="ws-btn ws-btn-ghost">Not yet</button>
            }
            @case ('accept') {
              <p class="m-0 text-[15px] leading-relaxed text-slate-700">{{ name() }}’s notice starts and the offboarding checklist is created. They stay active until the last working day.</p>
              <label class="ws-field">Last working day
                <input class="ws-input" type="date" [min]="x.noticeDate.slice(0, 10)" [value]="lastDay()" (input)="lastDay.set($any($event.target).value)">
                <span class="hint">They asked for {{ day(x.requestedLastDay ?? x.lastWorkingDay) }}@if (x.noticePeriodDays) {; their notice period is {{ x.noticePeriodDays }} days}.</span>
              </label>
              <label class="ws-field"><span>Note to {{ name() }} <span class="font-normal text-slate-600">· optional</span></span>
                <input class="ws-input" maxlength="500" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="e.g. Agreed with handover to Sameer">
              </label>
              <button type="button" (click)="accept()" [disabled]="working() || !lastDay()" class="ws-btn ws-btn-primary">{{ working() ? 'Accepting…' : 'Accept · last day ' + day(lastDay() || x.lastWorkingDay) }}</button>
            }
            @case ('decline') {
              <p class="m-0 text-[15px] leading-relaxed text-slate-700">{{ name() }} stays on and sees your reason.</p>
              <label class="ws-field">Reason
                <textarea class="ws-input" rows="3" maxlength="500" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="e.g. Let’s talk about the team move first" [attr.aria-invalid]="tried() && !text().trim()"></textarea>
                @if (tried() && !text().trim()) { <span class="err">Say why, so they know what happens next.</span> }
              </label>
              <button type="button" (click)="decline()" [disabled]="working()" class="ws-btn btn-danger">{{ working() ? 'Declining…' : 'Decline resignation' }}</button>
            }
            @case ('withdraw') {
              <p class="m-0 text-[15px] leading-relaxed text-slate-700">{{ name() }} stays on. The exit and its checklist are kept in their history.</p>
              <label class="ws-field"><span>Why <span class="font-normal text-slate-600">· optional</span></span>
                <input class="ws-input" maxlength="500" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="e.g. Accepted a counter-offer">
              </label>
              <button type="button" (click)="withdraw()" [disabled]="working()" class="ws-btn ws-btn-primary">{{ working() ? 'Withdrawing…' : 'Withdraw exit' }}</button>
              <button type="button" (click)="close()" class="ws-btn ws-btn-ghost">Keep it</button>
            }
            @case ('add') {
              <form class="flex flex-col gap-3.5" (submit)="$event.preventDefault(); add()" novalidate>
                <label class="ws-field">What needs doing
                  <input class="ws-input" maxlength="200" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="e.g. Hand over vendor contacts" [attr.aria-invalid]="tried() && !text().trim()">
                  @if (tried() && !text().trim()) { <span class="err">Enter what needs doing.</span> }
                </label>
                <label class="ws-field">Who looks after it
                  <select class="ws-input" (change)="ownerPick.set($any($event.target).value)">
                    @for (o of owners; track o) { <option [value]="o" [selected]="o === ownerPick()">{{ owner(o) }}</option> }
                  </select>
                </label>
                <span class="hint -mt-2">Only for {{ name() }}’s exit. To add it to every exit, use Company settings → Offboarding checklist.</span>
                <button type="submit" [disabled]="working()" class="ws-btn ws-btn-primary">{{ working() ? 'Adding…' : 'Add step' }}</button>
              </form>
            }
            @case ('task') {
              <p class="m-0 text-[15px] text-slate-700">{{ s.task.title }} · <span class="owner">{{ owner(s.task.owner) }}</span></p>
              <label class="ws-field">Note
                <textarea class="ws-input" rows="3" maxlength="1000" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="e.g. Laptop LT-2291 received in good condition"></textarea>
              </label>
              <button type="button" (click)="saveNote(s.task)" [disabled]="working()" class="ws-btn ws-btn-primary">{{ working() ? 'Saving…' : 'Save note' }}</button>
              @if (!s.task.done) {
                <button type="button" (click)="remove(s.task)" [disabled]="working()" class="ws-btn ws-btn-ghost !text-red-700">Remove this step</button>
              }
            }
          }
        </section>
      </div>
    }
  `,
  styles: [`
    .card { padding:14px 16px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; display:flex; flex-direction:column; gap:10px; }
    .card-h { margin:0; font-size:13px; font-weight:600; color:#475569; text-transform:uppercase; letter-spacing:.06em; }
    .facts { margin:0; display:grid; grid-template-columns:110px 1fr; row-gap:8px; column-gap:8px; font-size:14px; }
    .facts dt { color:#475569; } .facts dd { margin:0; min-width:0; overflow-wrap:anywhere; }
    .tick { width:44px; height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:transparent; border:0; cursor:pointer; color:#fff; position:relative; }
    .tick::before { content:''; position:absolute; width:22px; height:22px; border-radius:7px; border:2px solid #94a3b8; background:#fff; }
    .tick-on::before { border-color:#059669; background:#059669; }
    .tick svg { position:relative; }
    .tick:focus-visible { outline:2px solid #4f46e5; outline-offset:-4px; border-radius:10px; }
    .owner { padding:1px 7px; border-radius:999px; background:#f1f5f9; color:#334155; font-weight:600; font-size:11px; }
    .seg { height:38px; border-radius:10px; border:0; font-size:14px; cursor:pointer; background:transparent; color:#475569; font-weight:500; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,.08); }
    .btn-danger { background:#b91c1c; color:#fff; } .btn-danger:hover { background:#991b1b; }
  `],
})
export class ExitCardComponent {
  readonly exit = input.required<ExitCase>();
  /** First name, for the sentences. */
  readonly name = input.required<string>();
  /** The exit changed (checklist ticked, completed, withdrawn); the profile reloads what it needs. */
  readonly changed = output<ExitCase>();

  private readonly people = inject(PeopleService);
  private readonly toast = inject(ToastService);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  readonly owners = TASK_OWNERS;
  readonly rehireOptions = [{ label: 'Yes', value: true }, { label: 'No', value: false }, { label: 'Not decided', value: null }] as const;
  readonly sheet = signal<Sheet>(null);
  readonly busy = signal<string | null>(null);
  readonly working = signal(false);
  readonly sheetError = signal<string | null>(null);
  readonly text = signal('');
  readonly ownerPick = signal('HR');
  readonly rehire = signal<boolean | null>(null);
  readonly tried = signal(false);
  readonly lastDay = signal('');
  readonly open_ = computed(() => this.exit().tasks.length - this.exit().tasksDone);
  readonly title = computed(() => {
    const s = this.sheet();
    return !s ? '' : s.kind === 'complete' ? `Complete ${this.name()}’s exit?` : s.kind === 'withdraw' ? `Withdraw ${this.name()}’s exit?`
      : s.kind === 'add' ? 'Add a step' : s.kind === 'accept' ? `Accept ${this.name()}’s resignation?` : s.kind === 'decline' ? `Decline ${this.name()}’s resignation?` : 'Checklist step';
  });

  constructor() {
    effect(() => { const el = this.dialog()?.nativeElement; if (el) setTimeout(() => ((el.querySelector('input,select,textarea') ?? el) as HTMLElement).focus(), 0); });
  }

  day(iso: string) { return fmtDay(iso); }
  owner(o: string) { return o === 'Employee' ? this.name() : o; }

  open(s: Exclude<Sheet, null>) {
    this.sheetError.set(null); this.tried.set(false);
    this.text.set(s.kind === 'task' ? s.task.note ?? '' : '');
    this.ownerPick.set('HR'); this.rehire.set(this.exit().rehireEligible);
    this.lastDay.set((this.exit().requestedLastDay ?? this.exit().lastWorkingDay).slice(0, 10));
    this.sheet.set(s);
  }
  close() { if (!this.working()) this.sheet.set(null); }

  async toggle(t: ExitTask) {
    this.busy.set(t.id);
    try { this.changed.emit(await firstValueFrom(this.people.updateExitTask(this.exit().employeeId, t.id, { done: !t.done }))); }
    catch (e) { this.toast.show(errorText(e, 'Could not update the checklist.')); }
    finally { this.busy.set(null); }
  }

  private async run(call: () => Promise<ExitCase>, done: string | null, fallback: string) {
    this.working.set(true); this.sheetError.set(null);
    try {
      const x = await call();
      this.working.set(false); this.sheet.set(null);
      if (done) this.toast.show(done);
      this.changed.emit(x);
    } catch (e) { this.sheetError.set(errorText(e, fallback)); this.working.set(false); }
  }

  accept() {
    return this.run(() => firstValueFrom(this.people.acceptResignation(this.exit().employeeId, this.lastDay() + 'T00:00:00Z', this.text().trim() || null)),
      `Resignation accepted. ${this.name()}’s last day is ${fmtDay(this.lastDay())}.`, 'Could not accept the resignation.');
  }
  decline() {
    this.tried.set(true);
    if (!this.text().trim()) return;
    return this.run(() => firstValueFrom(this.people.declineResignation(this.exit().employeeId, this.text().trim())),
      `Resignation declined. ${this.name()} will see your reason.`, 'Could not decline the resignation.');
  }

  complete() {
    return this.run(() => firstValueFrom(this.people.completeExit(this.exit().employeeId, this.rehire())),
      `${this.name()} has left. Their login is switched off.`, 'Could not complete the exit.');
  }
  withdraw() {
    return this.run(() => firstValueFrom(this.people.withdrawExit(this.exit().employeeId, this.text().trim() || null)),
      `Exit withdrawn. ${this.name()} stays on.`, 'Could not withdraw the exit.');
  }
  add() {
    this.tried.set(true);
    if (!this.text().trim()) return;
    return this.run(() => firstValueFrom(this.people.addExitTask(this.exit().employeeId, this.text().trim(), this.ownerPick())), 'Step added.', 'Could not add the step.');
  }
  saveNote(t: ExitTask) {
    return this.run(() => firstValueFrom(this.people.updateExitTask(this.exit().employeeId, t.id, { note: this.text().trim() })), 'Note saved.', 'Could not save the note.');
  }
  remove(t: ExitTask) {
    return this.run(() => firstValueFrom(this.people.deleteExitTask(this.exit().employeeId, t.id)), 'Step removed.', 'Could not remove the step.');
  }
}
