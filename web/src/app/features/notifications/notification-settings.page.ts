import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft } from '@lucide/angular';
import { NotificationPreference, NotificationsService } from './notifications.service';
import { errorText } from '../people/people-errors';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonComponent } from '../../shared/skeleton.component';

/** Choose which notifications also come by email. The in-app inbox always gets everything. */
@Component({
  standalone: true,
  imports: [RouterLink, SkeletonComponent, LucideArrowLeft],
  styles: [`
    .seg { height:38px; border:0; border-radius:9px; background:transparent; font:500 13px 'Geist',sans-serif; color:#334155; cursor:pointer; }
    .seg-on { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgb(15 23 42 / .12); }
  `],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/notifications" aria-label="Back to notifications" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Notification settings</h1>
      </header>
      <div class="p-4 flex flex-col gap-4">
        <p class="m-0 px-1 text-[14px] text-slate-700">Everything shows in your WorkSphere inbox. Choose what also comes by email.
          <b>Important</b> means things waiting for you and decisions about your requests.</p>
        @if (loading()) { <ws-skeleton kind="form" [rows]="4" /> }
        @else if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        @else {
          <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
            @for (p of prefs(); track p.category) {
              <li class="px-4 py-3.5 border-b border-slate-100 last:border-b-0 flex flex-col gap-2.5">
                <span class="flex flex-col"><span class="text-[15px] font-semibold">{{ p.label }}</span><span class="text-[12px] text-slate-600">{{ p.hint }}</span></span>
                <div class="grid grid-cols-3 p-1 rounded-12 bg-slate-100" role="group" [attr.aria-label]="'Email for ' + p.label">
                  @for (o of options; track o.v) {
                    <button type="button" class="seg" [class.seg-on]="p.email === o.v" [attr.aria-pressed]="p.email === o.v" (click)="set(p, o.v)">{{ o.label }}</button>
                  }
                </div>
              </li>
            }
          </ul>
          <p class="m-0 px-1 text-[12px] text-slate-500">Changes save straight away. Phone notifications come with the WorkSphere app.</p>
        }
      </div>
    </div>
  `,
})
export class NotificationSettingsPage {
  private readonly svc = inject(NotificationsService);
  private readonly toast = inject(ToastService);
  readonly options = [{ v: 'All' as const, label: 'All email' }, { v: 'Important' as const, label: 'Important' }, { v: 'None' as const, label: 'No email' }];
  readonly prefs = signal<NotificationPreference[]>([]);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  constructor() {
    firstValueFrom(this.svc.preferences()).then(x => this.prefs.set(x))
      .catch(e => this.error.set(errorText(e, 'Could not load your settings.'))).finally(() => this.loading.set(false));
  }
  async set(p: NotificationPreference, v: 'All' | 'Important' | 'None') {
    const was = p.email;
    this.prefs.update(a => a.map(x => x.category === p.category ? { ...x, email: v } : x));
    try { this.prefs.set(await firstValueFrom(this.svc.savePreferences({ [p.category]: v }))); this.toast.show('Saved'); }
    catch (e) { this.prefs.update(a => a.map(x => x.category === p.category ? { ...x, email: was } : x)); this.toast.show(errorText(e, 'Could not save.'), 'error'); }
  }
}
