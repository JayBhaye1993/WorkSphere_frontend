import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { LucideArrowLeft, LucideLock } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { CustomField, Employee, UpdateMyProfile } from '../../../core/models/people.models';
import { AvatarComponent } from '../../../shared/avatar.component';
import { CustomFieldInputComponent } from '../../../shared/custom-field-input.component';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';

const PHONE = /^\+?[0-9 ()-]{6,20}$/;
const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

interface Form { phone: string; dateOfBirth: string; gender: string; address: string; emergencyContact: string; emergencyPhone: string; }

/** Your own details: what you may change yourself, and what HR keeps (read-only). */
@Component({
  standalone: true,
  imports: [RouterLink, AvatarComponent, CustomFieldInputComponent, LucideArrowLeft, LucideLock],
  template: `
    <div class="mx-auto max-w-[640px] min-h-full flex flex-col">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more" aria-label="Back" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900">
          <svg lucideArrowLeft [size]="22" aria-hidden="true"></svg>
        </a>
        <h1 class="m-0 text-[18px] font-bold">My profile</h1>
      </header>

      @if (loading()) {
        <p class="p-4 text-[14px] text-slate-600">Loading your profile…</p>
      } @else if (loadError()) {
        <div class="m-4 ws-alert" role="alert">{{ loadError() }}</div>
      } @else { @if (me(); as e) {
        <form class="flex-1 p-4 flex flex-col gap-4" (submit)="$event.preventDefault(); save()" novalidate>
          <div class="flex items-center gap-3">
            <ws-avatar [name]="e.fullName" [photo]="e.profilePhotoUrl" [size]="52" />
            <div class="min-w-0 flex flex-col">
              <span class="text-[17px] font-bold">{{ e.fullName }}</span>
              <span class="text-[13px] text-slate-600 truncate">{{ e.email }}</span>
            </div>
          </div>

          @if (saveError()) { <div class="ws-alert" role="alert">{{ saveError() }}</div> }

          <section class="ws-card">
            <h2 class="ws-card-h">You can change</h2>
            <label class="ws-field">Mobile number
              <input class="ws-input" type="tel" inputmode="tel" autocomplete="tel" [value]="f().phone" (input)="set('phone', $any($event.target).value)"
                     [attr.aria-invalid]="!!phoneError()" placeholder="+91 98xxx xxxxx">
              @if (phoneError()) { <span class="err">{{ phoneError() }}</span> }
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">Date of birth
                <input class="ws-input" type="date" [value]="f().dateOfBirth" [max]="maxDob" (input)="set('dateOfBirth', $any($event.target).value)">
              </label>
              <label class="ws-field">Gender
                <select class="ws-input" (change)="set('gender', $any($event.target).value)">
                  <option value="" [selected]="!f().gender">Not set</option>
                  @for (g of genders; track g) { <option [value]="g" [selected]="g === f().gender">{{ g }}</option> }
                </select>
              </label>
            </div>
            <label class="ws-field">Current address
              <textarea class="ws-input" rows="3" autocomplete="street-address" [value]="f().address" (input)="set('address', $any($event.target).value)"></textarea>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">Emergency contact
                <input class="ws-input" [value]="f().emergencyContact" placeholder="Name, relation" (input)="set('emergencyContact', $any($event.target).value)">
              </label>
              <label class="ws-field">Their phone
                <input class="ws-input" type="tel" inputmode="tel" [value]="f().emergencyPhone" (input)="set('emergencyPhone', $any($event.target).value)"
                       [attr.aria-invalid]="!!emergencyPhoneError()">
                @if (emergencyPhoneError()) { <span class="err">{{ emergencyPhoneError() }}</span> }
              </label>
            </div>
            @for (cf of editableFields(); track cf.key) {
              <ws-custom-field-input [field]="cf" [value]="custom()[cf.key] ?? null" (valueChange)="setCustom(cf.key, $event)" />
            }
          </section>

          <section class="p-4 rounded-14 bg-slate-100 flex flex-col gap-3">
            <h2 class="ws-card-h flex items-center gap-1.5"><svg lucideLock [size]="14" aria-hidden="true"></svg>Kept by HR</h2>
            <dl class="m-0 grid grid-cols-[110px_1fr] gap-y-2 gap-x-2 text-[14px]">
              @for (r of hrRows(); track r[0]) { <dt class="text-slate-600">{{ r[0] }}</dt><dd class="m-0">{{ r[1] }}</dd> }
            </dl>
            <p class="m-0 text-[13px] text-slate-600">Something wrong here? Ask HR to correct it.</p>
            <a [routerLink]="['/people', e.id, 'history']" class="self-start min-h-[44px] flex items-center text-[14px] font-semibold">See your career and change history</a>
          </section>

          <div class="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-slate-200 mt-auto">
            <button type="submit" class="ws-btn ws-btn-primary w-full" [disabled]="!dirty() || saving() || invalid()">
              {{ saving() ? 'Saving…' : dirty() ? 'Save changes' : 'No changes' }}
            </button>
          </div>
        </form>
      } }
    </div>
  `,
})
export class MyProfilePage {
  private readonly people = inject(PeopleService);
  private readonly toast = inject(ToastService);

  readonly genders = GENDERS;
  readonly maxDob = new Date(Date.now() - 14 * 365.25 * 864e5).toISOString().slice(0, 10);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly me = signal<Employee | null>(null);
  readonly fields = signal<CustomField[]>([]);
  readonly f = signal<Form>({ phone: '', dateOfBirth: '', gender: '', address: '', emergencyContact: '', emergencyPhone: '' });
  readonly custom = signal<Record<string, unknown>>({});
  private original = '';

  readonly editableFields = computed(() => this.fields().filter(x => x.isActive && x.employeeEditable));
  readonly phoneError = computed(() => this.f().phone && !PHONE.test(this.f().phone) ? 'Enter a valid phone number.' : null);
  readonly emergencyPhoneError = computed(() => this.f().emergencyPhone && !PHONE.test(this.f().emergencyPhone) ? 'Enter a valid phone number.' : null);
  readonly invalid = computed(() => !!this.phoneError() || !!this.emergencyPhoneError());
  readonly dirty = computed(() => this.snapshot() !== this.original);

  readonly hrRows = computed(() => {
    const e = this.me();
    if (!e) return [];
    return ([
      ['Title', e.designationName], ['Department', e.departmentName], ['Manager', e.managerName], ['Grade', e.gradeName],
      ['Type', e.employmentType], ['Location', e.locationName], ['Code', e.employeeCode],
    ] as [string, string | null][]).filter(r => !!r[1]) as [string, string][];
  });

  constructor() { void this.load(); }

  set<K extends keyof Form>(k: K, v: string) { this.f.update(x => ({ ...x, [k]: v })); this.saveError.set(null); }
  setCustom(k: string, v: unknown) { this.custom.update(x => ({ ...x, [k]: v })); this.saveError.set(null); }

  private snapshot() {
    const editable = Object.fromEntries(this.editableFields().map(x => [x.key, this.custom()[x.key] ?? null]));
    return JSON.stringify([this.f(), editable]);
  }

  private async load() {
    try {
      const [me, fields] = await Promise.all([
        firstValueFrom(this.people.me()),
        firstValueFrom(this.people.customFields().pipe(catchError(() => of([] as CustomField[])))),
      ]);
      this.fields.set(fields);
      this.fill(me);
    } catch (e) {
      this.loadError.set(errorText(e, 'Could not load your profile.'));
    } finally { this.loading.set(false); }
  }

  private fill(me: Employee) {
    this.me.set(me);
    this.f.set({
      phone: me.phone ?? '', dateOfBirth: me.dateOfBirth ? me.dateOfBirth.slice(0, 10) : '', gender: me.gender ?? '',
      address: me.address ?? '', emergencyContact: me.emergencyContact ?? '', emergencyPhone: me.emergencyPhone ?? '',
    });
    this.custom.set({ ...(me.customFields ?? {}) });
    this.original = this.snapshot();
  }

  async save() {
    if (!this.dirty() || this.invalid()) return;
    const was = JSON.parse(this.original)[1] as Record<string, unknown>;
    const changed = Object.fromEntries(this.editableFields()
      .filter(x => JSON.stringify(this.custom()[x.key] ?? null) !== JSON.stringify(was[x.key] ?? null))
      .map(x => [x.key, this.custom()[x.key] ?? null]));
    const v = this.f();
    // Empty strings clear a value; leaving the date empty keeps the saved one.
    const body: UpdateMyProfile = {
      phone: v.phone.trim(), gender: v.gender, address: v.address.trim(),
      emergencyContact: v.emergencyContact.trim(), emergencyPhone: v.emergencyPhone.trim(),
      dateOfBirth: v.dateOfBirth ? v.dateOfBirth + 'T00:00:00Z' : null,
      customFields: Object.keys(changed).length ? changed : undefined,
    };
    this.saving.set(true); this.saveError.set(null);
    try {
      this.fill(await firstValueFrom(this.people.updateMe(body)));
      this.toast.show('Your profile is saved.');
    } catch (e) {
      this.saveError.set(errorText(e, 'Could not save. Please try again.'));
    } finally { this.saving.set(false); }
  }
}
