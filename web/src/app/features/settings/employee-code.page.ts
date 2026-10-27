import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft } from '@lucide/angular';
import { SettingsService } from './settings.service';
import { EmployeeSettings } from '../../core/models/people.models';
import { ToastService } from '../../core/services/toast.service';
import { errorText } from '../people/people-errors';

/** How new employee codes look (prefix + zero-padded number). */
@Component({
  standalone: true,
  imports: [RouterLink, LucideArrowLeft],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full flex flex-col">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to company settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Employee code</h1>
      </header>
      @if (loading()) { <p class="p-4 text-[14px] text-slate-600">Loading…</p> }
      @else {
        <form class="flex-1 p-4 flex flex-col gap-4" (submit)="$event.preventDefault(); save()" novalidate>
          @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
          <div class="p-5 rounded-14 bg-indigo-50 flex flex-col items-center gap-1" aria-live="polite">
            <span class="text-[13px] text-indigo-700 font-semibold">The next person gets</span>
            <span class="mono text-[28px] font-bold text-slate-900">{{ preview() }}</span>
          </div>
          <section class="ws-card">
            <label class="ws-field">Prefix
              <input class="ws-input mono" [value]="prefix()" maxlength="10" (input)="prefix.set($any($event.target).value)" [attr.aria-invalid]="!!prefixError()">
              @if (prefixError()) { <span class="err">{{ prefixError() }}</span> } @else { <span class="hint">Letters, digits, - _ / (up to 10). For example NT- or EMP.</span> }
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">Digits
                <select class="ws-input" (change)="padding.set(+$any($event.target).value)">
                  @for (n of [1,2,3,4,5,6,7,8]; track n) { <option [value]="n" [selected]="n === padding()">{{ n }}</option> }
                </select>
              </label>
              <label class="ws-field">Next number
                <input class="ws-input mono" type="number" inputmode="numeric" min="1" [value]="next()" (input)="next.set(+$any($event.target).value)" [attr.aria-invalid]="next() < 1">
              </label>
            </div>
            <p class="m-0 text-[13px] text-slate-600">Codes already given to someone are skipped automatically, so no code is ever used twice. Existing people keep their codes.</p>
          </section>
          <div class="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-200 mt-auto">
            <button type="submit" class="ws-btn ws-btn-primary w-full" [disabled]="busy() || !!prefixError() || next() < 1 || !dirty()">{{ busy() ? 'Saving…' : dirty() ? 'Save' : 'No changes' }}</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class EmployeeCodePage {
  private readonly svc = inject(SettingsService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(true); readonly busy = signal(false); readonly error = signal<string | null>(null);
  readonly prefix = signal(''); readonly padding = signal(4); readonly next = signal(1);
  private saved = '';
  readonly preview = computed(() => this.prefix() + String(Math.max(1, this.next() || 1)).padStart(this.padding(), '0'));
  readonly prefixError = computed(() => !this.prefix().trim() ? 'Enter a prefix.' : /^[A-Za-z0-9\-_/]+$/.test(this.prefix()) ? null : 'Use only letters, digits, - _ /.');
  readonly dirty = computed(() => JSON.stringify([this.prefix(), this.padding(), this.next()]) !== this.saved);

  constructor() { void this.load(); }
  private apply(s: EmployeeSettings) {
    this.prefix.set(s.codePrefix); this.padding.set(s.codePadding); this.next.set(s.nextCodeNumber);
    this.saved = JSON.stringify([s.codePrefix, s.codePadding, s.nextCodeNumber]);
  }
  private async load() {
    try { this.apply(await firstValueFrom(this.svc.get<EmployeeSettings>('employee-settings'))); }
    catch (e) { this.error.set(errorText(e, 'Could not load the code format.')); }
    finally { this.loading.set(false); }
  }
  async save() {
    this.busy.set(true); this.error.set(null);
    try {
      this.apply(await firstValueFrom(this.svc.put<EmployeeSettings>('employee-settings', { codePrefix: this.prefix().trim(), codePadding: this.padding(), nextCodeNumber: this.next() })));
      this.toast.show(`Saved. The next person gets ${this.preview()}.`);
    } catch (e) { this.error.set(errorText(e, 'Could not save.')); }
    finally { this.busy.set(false); }
  }
}
