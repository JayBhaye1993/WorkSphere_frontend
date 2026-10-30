import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideChevronRight, LucidePlus, LucideX, LucideFingerprintPattern, LucideCopy, LucideKeyRound, LucideSearch, LucideTriangleAlert } from '@lucide/angular';
import { AttendanceService, Device, DeviceInput, PersonId, Unmatched } from '../attendance.service';
import { errorText } from '../../people/people-errors';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsService } from '../../settings/settings.service';
import { SkeletonComponent } from '../../../shared/skeleton.component';

interface Draft extends DeviceInput { id: string | null; }
const BRANDS = ['eSSL', 'ZKTeco', 'Realtime', 'Matrix', 'Mantra', 'Other'];
const PROTOCOLS = [
  { id: 'Push', name: 'The machine sends punches itself', hint: 'eSSL, ZKTeco and most newer machines (called ADMS, Cloud server or Push).' },
  { id: 'Agent', name: 'A connector on an office computer', hint: 'For older machines on the office network. The connector uses a key.' },
  { id: 'Import', name: 'Upload a file from the machine', hint: 'Export punches from the machine and upload them.' },
];

/** Settings › Attendance machines: thumb or face machines that send punches, and which machine ID belongs to whom. */
@Component({
  standalone: true,
  imports: [RouterLink, SkeletonComponent, LucideArrowLeft, LucideChevronRight, LucidePlus, LucideX, LucideFingerprintPattern, LucideCopy, LucideKeyRound, LucideSearch, LucideTriangleAlert],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full pb-8">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/more/settings" aria-label="Back to settings" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 flex-1 text-[18px] font-bold">Attendance machines</h1>
        @if (tab() === 'machines') { <button type="button" (click)="open(null)" aria-label="Add a machine" class="w-11 h-11 mr-1 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 text-indigo-700 cursor-pointer"><svg lucidePlus [size]="22" aria-hidden="true"></svg></button> }
      </header>
      <div class="p-4 flex flex-col gap-4">
        <div class="flex p-1 rounded-full bg-slate-100 self-start" role="tablist">
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'machines'" (click)="tab.set('machines')" class="h-9 px-4 rounded-full border-0 text-[14px] font-semibold cursor-pointer" [class]="tab() === 'machines' ? 'bg-white shadow-sm text-slate-900' : 'bg-transparent text-slate-600'">Machines</button>
          <button type="button" role="tab" [attr.aria-selected]="tab() === 'ids'" (click)="tab.set('ids')" class="h-9 px-4 rounded-full border-0 text-[14px] font-semibold cursor-pointer" [class]="tab() === 'ids' ? 'bg-white shadow-sm text-slate-900' : 'bg-transparent text-slate-600'">
            People’s IDs @if (unmatched().length) { <span class="ml-1 px-1.5 rounded-full bg-orange-500 text-white text-[11px]">{{ unmatched().length }}</span> }
          </button>
        </div>
        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }

        @if (loading()) { <ws-skeleton kind="list" [rows]="3" /> }
        @else if (tab() === 'machines') {
          <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
            @for (d of devices(); track d.id) {
              <li class="border-b border-slate-100 last:border-b-0">
                <button type="button" (click)="open(d)" class="w-full flex items-center gap-3 min-h-[68px] px-4 py-2 bg-transparent border-0 text-left cursor-pointer hover:bg-slate-50" [class.opacity-60]="!d.isActive">
                  <span class="relative w-10 h-10 shrink-0 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center" aria-hidden="true">
                    <svg lucideFingerprintPattern [size]="20"></svg>
                    <span class="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white" [class]="d.online ? 'bg-emerald-500' : 'bg-slate-300'"></span>
                  </span>
                  <span class="flex-1 min-w-0 flex flex-col">
                    <span class="text-[15px] font-semibold text-slate-900 truncate">{{ d.name }}</span>
                    <span class="text-[12px] text-slate-600 truncate">{{ d.brand || 'Machine' }} · <span class="mono">{{ d.serialNumber }}</span> · {{ protocolShort(d.protocol) }}</span>
                    <span class="text-[12px]" [class]="d.online ? 'text-emerald-700' : 'text-slate-500'">{{ status(d) }}</span>
                  </span>
                  <svg lucideChevronRight [size]="16" class="text-slate-400" aria-hidden="true"></svg>
                </button>
              </li>
            } @empty {
              <li class="px-4 py-6 flex flex-col items-center gap-2 text-center">
                <svg lucideFingerprintPattern [size]="32" class="text-slate-400" aria-hidden="true"></svg>
                <span class="text-[15px] font-semibold">No machines yet</span>
                <span class="text-[13px] text-slate-600 max-w-[420px]">Until you have one, people check in from the app and HR adds missed punches by hand. Add your thumb or face machine here when it arrives.</span>
                <button type="button" (click)="open(null)" class="ws-btn ws-btn-primary mt-1">Add a machine</button>
              </li>
            }
          </ul>

          <section class="flex flex-col gap-2 p-4 rounded-14 bg-white border border-slate-200">
            <h2 class="m-0 text-[15px] font-bold">Connecting a machine that sends punches itself</h2>
            <ol class="m-0 pl-5 list-decimal flex flex-col gap-1.5 text-[14px] text-slate-700">
              <li>Add it here with the serial number printed on the machine (also under Menu › System info).</li>
              <li>On the machine open <b>Menu › Comm. › Cloud server setting</b> (or ADMS).</li>
              <li>Server address: <span class="mono font-semibold">{{ server().host }}</span>, port <span class="mono font-semibold">{{ server().port }}</span>. Turn “Domain name” on if it asks.</li>
              <li>Save and restart the machine. It shows as online here within a minute, and punches start arriving.</li>
            </ol>
            @if (server().local) { <p class="m-0 text-[12px] text-amber-800 flex gap-1.5"><svg lucideTriangleAlert [size]="14" class="shrink-0 mt-0.5" aria-hidden="true"></svg>This is a test setup on this computer. A machine needs this computer’s network address (not localhost) on the same Wi-Fi, or the live site address once WorkSphere is online.</p> }
            <p class="m-0 text-[12px] text-slate-600">Each punch lands on the person whose ID on the machine matches. By default that is their employee code; set a different one under People’s IDs.</p>
          </section>
        } @else {
          @if (unmatched().length) {
            <section class="flex flex-col gap-2">
              <h2 class="m-0 px-1 text-[13px] font-semibold text-orange-700 uppercase tracking-[.06em]">IDs nobody has yet</h2>
              <p class="m-0 px-1 text-[13px] text-slate-600">These punches came from a machine but no one has that ID. Give it to the right person and their punches appear.</p>
              <ul class="list-none m-0 p-0 bg-white border border-orange-200 rounded-14 overflow-hidden">
                @for (u of unmatched(); track u.attendanceId) {
                  <li class="flex flex-col lg:flex-row lg:items-center gap-2 px-4 py-3 border-b border-slate-100 last:border-b-0">
                    <span class="flex-1 flex flex-col"><span class="text-[15px] font-semibold mono">{{ u.attendanceId }}</span><span class="text-[12px] text-slate-600">{{ u.punches }} punch{{ u.punches > 1 ? 'es' : '' }} · last {{ when(u.lastAt) }}{{ u.deviceName ? ' · ' + u.deviceName : '' }}</span></span>
                    <select class="ws-input lg:!w-[240px] !h-10" [attr.aria-label]="'Person for ID ' + u.attendanceId" (change)="give(u, $any($event.target).value)">
                      <option value="">Give to…</option>
                      @for (p of active(); track p.employeeId) { <option [value]="p.employeeId">{{ p.name }}{{ p.employeeCode ? ' · ' + p.employeeCode : '' }}</option> }
                    </select>
                  </li>
                }
              </ul>
            </section>
          }
          <section class="flex flex-col gap-2">
            <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">ID on the machine</h2>
            <label class="relative">
              <span class="sr-only">Search people</span>
              <svg lucideSearch [size]="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"></svg>
              <input class="ws-input !pl-10" placeholder="Search by name or ID" [value]="q()" (input)="q.set($any($event.target).value)" />
            </label>
            <ul class="list-none m-0 p-0 bg-white border border-slate-200 rounded-14 overflow-hidden">
              @for (p of shownPeople(); track p.employeeId) {
                <li class="flex items-center gap-3 min-h-[60px] px-4 py-2 border-b border-slate-100 last:border-b-0">
                  <span class="flex-1 min-w-0 flex flex-col"><span class="text-[15px] font-medium truncate">{{ p.name }}</span>
                    <span class="text-[12px] text-slate-600">{{ p.biometricId ? 'Own machine ID' : 'Uses employee code' }}</span></span>
                  @if (editing() === p.employeeId) {
                    <input class="ws-input !w-[120px] !h-10 mono" [value]="editValue()" (input)="editValue.set($any($event.target).value)" (keydown.enter)="saveId(p)" [attr.aria-label]="'Machine ID for ' + p.name" [placeholder]="p.employeeCode ?? ''" />
                    <button type="button" (click)="saveId(p)" class="h-10 px-3 rounded-lg bg-indigo-600 text-white border-0 text-[13px] font-semibold cursor-pointer">Save</button>
                  } @else {
                    <button type="button" (click)="editing.set(p.employeeId); editValue.set(p.biometricId ?? '')" class="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 mono text-[14px] font-semibold cursor-pointer" [attr.aria-label]="'Change machine ID for ' + p.name">{{ p.attendanceId || '—' }}</button>
                  }
                </li>
              } @empty { <li class="px-4 py-4 text-[14px] text-slate-600">Nobody matches.</li> }
            </ul>
            @if (filteredPeople().length > shownPeople().length) { <button type="button" (click)="limit.set(limit() + 50)" class="ws-btn ws-btn-ghost self-center">Show more</button> }
          </section>
        }
      </div>

      @if (draft(); as d) {
        <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="close()">
          <section role="dialog" aria-modal="true" [attr.aria-label]="d.id ? 'Edit machine' : 'Add machine'" (click)="$event.stopPropagation()"
                   class="w-full lg:max-w-[520px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4">
            <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
            <div class="flex items-center gap-2">
              <h2 class="m-0 flex-1 text-[19px] font-bold">{{ d.id ? 'Edit machine' : 'Add machine' }}</h2>
              <button type="button" (click)="close()" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
            </div>
            @if (newKey(); as k) {
              <div class="flex flex-col gap-2 p-3 rounded-14 bg-amber-50 border border-amber-300">
                <span class="flex items-center gap-2 text-[14px] font-semibold text-amber-900"><svg lucideKeyRound [size]="16" aria-hidden="true"></svg>Connector key: copy it now</span>
                <span class="text-[12px] text-amber-900">It is shown only this once. Put it in the connector on the office computer. Lost it? Make a new one.</span>
                <div class="flex items-center gap-2">
                  <code class="flex-1 min-w-0 px-2 py-2 rounded-lg bg-white border border-amber-200 text-[13px] break-all">{{ k }}</code>
                  <button type="button" (click)="copy(k)" aria-label="Copy key" class="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-white border border-amber-300 cursor-pointer"><svg lucideCopy [size]="16" aria-hidden="true"></svg></button>
                </div>
              </div>
            }
            @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }
            <label class="ws-field">Name <input class="ws-input" [value]="d.name" (input)="patch({ name: $any($event.target).value })" maxlength="100" placeholder="e.g. Pune main door" /></label>
            <div class="grid grid-cols-2 gap-3">
              <label class="ws-field">Serial number <input class="ws-input mono" [value]="d.serialNumber" (input)="patch({ serialNumber: $any($event.target).value })" maxlength="50" [disabled]="!!d.id" placeholder="e.g. CQZ7224160012" /></label>
              <label class="ws-field">Brand
                <select class="ws-input" [value]="d.brand ?? ''" (change)="patch({ brand: $any($event.target).value || null })">
                  <option value="">Choose…</option>
                  @for (b of brands; track b) { <option [value]="b" [selected]="d.brand === b">{{ b }}</option> }
                </select>
              </label>
            </div>
            @if (locations().length) {
              <label class="ws-field">Location
                <select class="ws-input" (change)="patch({ locationId: $any($event.target).value || null })">
                  <option value="">Not set</option>
                  @for (l of locations(); track l.id) { <option [value]="l.id" [selected]="d.locationId === l.id">{{ l.name }}</option> }
                </select>
              </label>
            }
            <fieldset class="m-0 p-0 border-0 flex flex-col gap-2">
              <legend class="p-0 mb-1 text-[14px] font-semibold">How punches arrive</legend>
              @for (p of protocols; track p.id) {
                <label class="flex items-start gap-3 p-3 rounded-12 border cursor-pointer" [class]="d.protocol === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'">
                  <input type="radio" name="protocol" class="mt-1 w-4 h-4 accent-indigo-600" [checked]="d.protocol === p.id" (change)="patch({ protocol: p.id })" />
                  <span class="flex flex-col"><span class="text-[14px] font-semibold">{{ p.name }}</span><span class="text-[12px] text-slate-600">{{ p.hint }}</span></span>
                </label>
              }
            </fieldset>
            @if (d.id) { <label class="flex items-center gap-3 min-h-[44px] text-[15px]"><input type="checkbox" class="w-5 h-5 accent-indigo-600" [checked]="d.isActive" (change)="patch({ isActive: $any($event.target).checked })" />Accept punches from this machine</label> }
            <div class="flex flex-wrap gap-2">
              @if (d.id) {
                <button type="button" (click)="remove(d)" [disabled]="saving()" class="ws-btn ws-btn-ghost !text-rose-700">Delete</button>
                @if (d.protocol === 'Agent') { <button type="button" (click)="regenerate(d)" [disabled]="saving()" class="ws-btn ws-btn-ghost">New key</button> }
              }
              <button type="button" (click)="save(d)" [disabled]="saving() || !d.name.trim() || !d.serialNumber.trim()" class="ws-btn ws-btn-primary flex-1">{{ saving() ? 'Saving…' : (d.id ? 'Save' : 'Add machine') }}</button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class MachinesPage {
  private readonly svc = inject(AttendanceService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  readonly brands = BRANDS; readonly protocols = PROTOCOLS;
  readonly tab = signal<'machines' | 'ids'>('machines');
  readonly devices = signal<Device[]>([]);
  readonly unmatched = signal<Unmatched[]>([]);
  readonly people = signal<PersonId[]>([]);
  readonly locations = signal<{ id: string; name: string }[]>([]);
  readonly loading = signal(true); readonly error = signal<string | null>(null);
  readonly draft = signal<Draft | null>(null); readonly newKey = signal<string | null>(null);
  readonly saving = signal(false); readonly sheetError = signal<string | null>(null);
  readonly q = signal(''); readonly limit = signal(50);
  readonly editing = signal<string | null>(null); readonly editValue = signal('');
  readonly active = computed(() => this.people().filter(p => p.isActive));
  readonly filteredPeople = computed(() => { const q = this.q().trim().toLowerCase(); return this.active().filter(p => !q || p.name.toLowerCase().includes(q) || (p.attendanceId ?? '').toLowerCase().includes(q)); });
  readonly shownPeople = computed(() => this.filteredPeople().slice(0, this.limit()));
  readonly server = computed(() => {
    const h = location.hostname, local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(h);
    return local ? { host: 'this computer’s address', port: '5010', local } : { host: h, port: location.port || (location.protocol === 'https:' ? '443' : '80'), local };
  });

  constructor() {
    void this.load();
    firstValueFrom(this.settings.list<{ id: string; name: string }>('locations')).then(x => this.locations.set(x)).catch(() => {});
  }
  async load() {
    this.error.set(null);
    try {
      const [d, u, p] = await Promise.all([firstValueFrom(this.svc.devices()), firstValueFrom(this.svc.unmatched()), firstValueFrom(this.svc.ids())]);
      this.devices.set(d); this.unmatched.set(u); this.people.set(p);
    } catch (e) { this.error.set(errorText(e, 'Could not load machines.')); }
    finally { this.loading.set(false); }
  }
  protocolShort(p: string) { return p === 'Push' ? 'sends itself' : p === 'Agent' ? 'via connector' : 'file upload'; }
  when(iso: string) { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  status(d: Device) {
    if (!d.isActive) return 'Switched off';
    if (!d.lastSeenAt) return 'Waiting for the machine to connect';
    return `${d.online ? 'Online' : 'Last seen ' + this.when(d.lastSeenAt)} · ${d.punchCount} punch${d.punchCount === 1 ? '' : 'es'}${d.lastPunchAt ? ', last ' + this.when(d.lastPunchAt) : ''}`;
  }

  open(d: Device | null) {
    this.sheetError.set(null); this.newKey.set(null);
    this.draft.set(d ? { id: d.id, name: d.name, serialNumber: d.serialNumber, brand: d.brand, locationId: d.locationId, protocol: d.protocol, isActive: d.isActive }
                     : { id: null, name: '', serialNumber: '', brand: 'eSSL', locationId: null, protocol: 'Push', isActive: true });
  }
  close() { this.draft.set(null); this.newKey.set(null); }
  patch(p: Partial<Draft>) { this.draft.update(d => d ? { ...d, ...p } : d); }
  async save(d: Draft) {
    this.saving.set(true); this.sheetError.set(null);
    const { id, ...body } = d; body.name = body.name.trim(); body.serialNumber = body.serialNumber.trim();
    try {
      const saved = await firstValueFrom(id ? this.svc.updateDevice(id, body) : this.svc.addDevice(body));
      await this.load();
      if (saved.key) { this.newKey.set(saved.key); this.draft.set({ ...d, id: saved.id }); this.toast.show('Machine added'); }
      else { this.close(); this.toast.show(id ? 'Saved' : 'Machine added'); }
    } catch (e) { this.sheetError.set(errorText(e, 'Could not save the machine.')); }
    finally { this.saving.set(false); }
  }
  async regenerate(d: Draft) {
    if (!d.id) return; this.saving.set(true); this.sheetError.set(null);
    try { const r = await firstValueFrom(this.svc.newKey(d.id)); this.newKey.set(r.key); this.toast.show('New key made; the old one stops working'); }
    catch (e) { this.sheetError.set(errorText(e, 'Could not make a new key.')); }
    finally { this.saving.set(false); }
  }
  async remove(d: Draft) {
    if (!d.id) return; this.saving.set(true);
    try { await firstValueFrom(this.svc.deleteDevice(d.id)); this.close(); this.toast.show('Deleted'); await this.load(); }
    catch (e) { this.sheetError.set(errorText(e, 'Could not delete.')); }
    finally { this.saving.set(false); }
  }
  async copy(k: string) { try { await navigator.clipboard.writeText(k); this.toast.show('Copied'); } catch { this.toast.show('Select the key and copy it', 'info'); } }

  async give(u: Unmatched, employeeId: string) {
    if (!employeeId) return;
    try { await firstValueFrom(this.svc.setId(employeeId, u.attendanceId)); this.toast.show(`${u.attendanceId} given; their punches are in`); await this.load(); }
    catch (e) { this.toast.show(errorText(e, 'Could not set the ID.'), 'error'); }
  }
  async saveId(p: PersonId) {
    const v = this.editValue().trim();
    try { await firstValueFrom(this.svc.setId(p.employeeId, v || null)); this.editing.set(null); this.toast.show(v ? 'Machine ID saved' : 'Back to the employee code'); await this.load(); }
    catch (e) { this.toast.show(errorText(e, 'Could not save the ID.'), 'error'); }
  }
}
