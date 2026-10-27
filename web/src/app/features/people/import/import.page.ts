import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideArrowLeft, LucideDownload, LucideFileSpreadsheet, LucideUpload } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { ImportPreview, ImportResult, ImportRow } from '../../../core/models/people.models';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';
import { XLSX, base64ToBlob, saveBlob } from '../../../core/util/download';

/**
 * Bulk add or update people from Excel/CSV (employees.create).
 * Get the template → choose a file → check it (nothing saved) → import → download the rows that failed.
 */
@Component({
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, LucideArrowLeft, LucideDownload, LucideUpload, LucideFileSpreadsheet],
  template: `
    <div class="mx-auto max-w-[720px] min-h-full flex flex-col">
      <header class="sticky top-0 z-10 h-14 px-1 bg-white border-b border-slate-200 flex items-center gap-1">
        <a routerLink="/people" aria-label="Back to people" class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"><svg lucideArrowLeft [size]="22" aria-hidden="true"></svg></a>
        <h1 class="m-0 text-[18px] font-bold">Import people</h1>
      </header>

      <div class="flex-1 p-4 flex flex-col gap-4">
        @if (result(); as r) {
          <section class="ws-card" aria-live="polite">
            <h2 class="m-0 text-[17px] font-bold">{{ r.failed ? 'Import finished with some problems' : 'Import finished' }}</h2>
            <div class="grid grid-cols-3 gap-2">
              <div class="stat"><span class="n text-emerald-700">{{ r.added }}</span><span>added</span></div>
              <div class="stat"><span class="n text-indigo-700">{{ r.updated }}</span><span>updated</span></div>
              <div class="stat"><span class="n" [class.text-red-700]="r.failed > 0">{{ r.failed }}</span><span>not imported</span></div>
            </div>
            @if (r.unchanged) { <p class="m-0 text-[13px] text-slate-600">{{ r.unchanged }} {{ r.unchanged === 1 ? 'row was' : 'rows were' }} already up to date.</p> }
            @if (r.errorFileBase64) {
              <button type="button" (click)="downloadErrors(r.errorFileBase64)" class="ws-btn ws-btn-ghost flex items-center justify-center gap-2"><svg lucideDownload [size]="18" aria-hidden="true"></svg>Download the rows that were not imported</button>
              <p class="m-0 text-[13px] text-slate-600">It has an Errors column. Fix those rows and upload that file again.</p>
            }
            <div class="grid grid-cols-2 gap-2 pt-1">
              <button type="button" (click)="reset()" class="ws-btn ws-btn-ghost">Import another file</button>
              <a routerLink="/people" class="ws-btn ws-btn-primary flex items-center justify-center no-underline">Go to People</a>
            </div>
          </section>
          <ul class="list-none m-0 p-0 flex flex-col gap-2">
            @for (x of r.failures; track x.row) { <li class="row-card"><ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: x }" /></li> }
          </ul>
        } @else {
          <section class="ws-card">
            <h2 class="step"><span class="num">1</span>Get the template</h2>
            <p class="m-0 text-[14px] text-slate-700 leading-relaxed">An Excel sheet with your company’s columns and drop-downs for teams, titles, locations, grades and types. To update people in bulk, use <b>Export</b> on the People list instead: change what you need and import that file.</p>
            <button type="button" (click)="template()" [disabled]="busy()" class="ws-btn ws-btn-ghost flex items-center justify-center gap-2"><svg lucideDownload [size]="18" aria-hidden="true"></svg>Download template</button>
          </section>

          <section class="ws-card">
            <h2 class="step"><span class="num">2</span>Choose your file</h2>
            <label class="pick" [class.pick-on]="!!file()">
              <svg lucideFileSpreadsheet [size]="22" aria-hidden="true"></svg>
              <span class="flex-1 min-w-0 flex flex-col">
                <span class="text-[15px] font-semibold truncate">{{ file()?.name ?? 'Choose an Excel or CSV file' }}</span>
                <span class="text-[12px] text-slate-600">{{ file() ? size(file()!.size) + ' · tap to change' : '.xlsx or .csv, up to 2,000 people' }}</span>
              </span>
              <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" class="sr-only" (change)="choose($any($event.target))">
            </label>
            <label class="toggle">
              <span class="flex-1 flex flex-col"><span class="text-[15px] font-semibold">Update existing people</span>
                <span class="text-[12px] text-slate-600">People already here (same work email) get the details from the file. Empty cells change nothing.</span></span>
              <input type="checkbox" class="w-6 h-6 accent-indigo-600" [checked]="updateExisting()" (change)="setUpdate($any($event.target).checked)">
            </label>
            <label class="toggle">
              <span class="flex-1 flex flex-col"><span class="text-[15px] font-semibold">Send login invites</span>
                <span class="text-[12px] text-slate-600">New people get an email to set a password. Leave off to invite them later from Users.</span></span>
              <input type="checkbox" class="w-6 h-6 accent-indigo-600" [checked]="invite()" (change)="invite.set($any($event.target).checked)">
            </label>
            @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
            @if (!preview()) {
              <button type="button" (click)="check()" [disabled]="!file() || busy()" class="ws-btn ws-btn-primary">{{ busy() ? 'Checking…' : 'Check file' }}</button>
              <p class="m-0 text-[12px] text-slate-600 text-center">Nothing is saved until you import.</p>
            }
          </section>

          @if (preview(); as p) {
            <section class="ws-card" aria-live="polite">
              <h2 class="step"><span class="num">3</span>Review and import</h2>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div class="stat"><span class="n text-emerald-700">{{ p.toAdd }}</span><span>to add</span></div>
                <div class="stat"><span class="n text-indigo-700">{{ p.toUpdate }}</span><span>to update</span></div>
                <div class="stat"><span class="n">{{ p.unchanged }}</span><span>unchanged</span></div>
                <div class="stat" [class.stat-bad]="p.withErrors > 0"><span class="n" [class.text-red-700]="p.withErrors > 0">{{ p.withErrors }}</span><span>with problems</span></div>
              </div>
              @if (p.ignoredColumns.length) { <p class="m-0 text-[13px] text-slate-600">Not used: {{ p.ignoredColumns.join(', ') }}.</p> }
              @if (p.withErrors) {
                <p class="m-0 text-[13px] text-slate-700">Rows with problems are skipped. Fix them in your file and check again, or import the rest now and fix them afterwards.</p>
                @if (p.errorFileBase64) { <button type="button" (click)="downloadErrors(p.errorFileBase64)" class="ws-btn ws-btn-ghost flex items-center justify-center gap-2"><svg lucideDownload [size]="18" aria-hidden="true"></svg>Download rows with problems</button> }
              }
              <button type="button" (click)="run()" [disabled]="busy() || toImport() === 0" class="ws-btn ws-btn-primary flex items-center justify-center gap-2">
                <svg lucideUpload [size]="18" aria-hidden="true"></svg>{{ busy() ? 'Importing…' : importLabel() }}</button>
              <button type="button" (click)="preview.set(null)" [disabled]="busy()" class="ws-btn ws-btn-ghost">Choose a different file</button>
            </section>

            @if (p.rows.length) {
              <section class="flex flex-col gap-2">
                <h2 class="m-0 px-1 text-[13px] font-semibold text-slate-600 uppercase tracking-[.06em]">Rows</h2>
                <ul class="list-none m-0 p-0 flex flex-col gap-2">
                  @for (x of p.rows; track x.row) { <li class="row-card"><ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: x }" /></li> }
                </ul>
                @if (p.rows.length < p.toAdd + p.toUpdate + p.withErrors) { <p class="m-0 px-1 text-[12px] text-slate-600">Showing the first {{ p.rows.length }}.</p> }
              </section>
            }
          }
        }
      </div>
    </div>

    <ng-template #rowTpl let-x>
      <div class="flex items-start gap-2">
        <span class="badge" [class]="'badge b-' + x.action">{{ actionLabel(x.action) }}</span>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <span class="text-[14px] font-semibold truncate">{{ x.name || x.email || 'Row ' + x.row }}</span>
          <span class="text-[12px] text-slate-600 truncate">Row {{ x.row }}@if (x.email) { · {{ x.email }} }</span>
          @if (x.changes.length && x.action === 'Update') { <span class="text-[13px] text-slate-700">Changes: {{ x.changes.join(', ') }}</span> }
          @for (i of x.issues; track $index) { <span class="text-[13px] text-red-700">@if (i.column) {<b>{{ i.column }}:</b> }{{ i.message }}</span> }
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .step { margin:0; display:flex; align-items:center; gap:10px; font-size:16px; font-weight:700; }
    .num { width:26px; height:26px; border-radius:999px; background:#eef2ff; color:#3730a3; font-size:13px; display:flex; align-items:center; justify-content:center; }
    .pick { display:flex; align-items:center; gap:12px; min-height:64px; padding:10px 14px; border:2px dashed #cbd5e1; border-radius:14px; cursor:pointer; color:#475569; background:#fff; }
    .pick-on { border-style:solid; border-color:#4f46e5; color:#3730a3; background:#eef2ff; }
    .pick:focus-within { outline:2px solid #4f46e5; outline-offset:2px; }
    .toggle { display:flex; align-items:center; gap:12px; min-height:56px; cursor:pointer; }
    .stat { display:flex; flex-direction:column; align-items:center; padding:10px 4px; border-radius:12px; background:#f8fafc; border:1px solid #e2e8f0; font-size:12px; color:#475569; }
    .stat .n { font-size:22px; font-weight:700; color:#0f172a; line-height:1.2; }
    .stat-bad { background:#fef2f2; border-color:#fecaca; }
    .row-card { padding:10px 12px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; }
    .badge { flex-shrink:0; margin-top:1px; padding:1px 8px; border-radius:999px; font-size:11px; font-weight:700; }
    .b-Add { background:#dcfce7; color:#166534; } .b-Update { background:#e0e7ff; color:#3730a3; }
    .b-Error { background:#fee2e2; color:#991b1b; } .b-Unchanged { background:#f1f5f9; color:#475569; }
  `],
})
export class ImportPage {
  private readonly people = inject(PeopleService);
  private readonly toast = inject(ToastService);

  readonly file = signal<File | null>(null);
  readonly updateExisting = signal(false);
  readonly invite = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<ImportPreview | null>(null);
  readonly result = signal<ImportResult | null>(null);
  readonly toImport = computed(() => (this.preview()?.toAdd ?? 0) + (this.preview()?.toUpdate ?? 0));
  readonly importLabel = computed(() => {
    const p = this.preview(); if (!p) return 'Import';
    const parts = [p.toAdd ? `add ${p.toAdd}` : '', p.toUpdate ? `update ${p.toUpdate}` : ''].filter(Boolean).join(' and ');
    return parts ? `Import: ${parts}` : 'Nothing to import';
  });

  size(b: number) { return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`; }
  actionLabel(a: ImportRow['action']) { return a === 'Add' ? 'New' : a === 'Update' ? 'Update' : a === 'Error' ? 'Problem' : 'Same'; }

  choose(input: HTMLInputElement) {
    const f = input.files?.[0] ?? null; input.value = '';
    this.error.set(null); this.preview.set(null);
    if (f && !/\.(xlsx|csv)$/i.test(f.name)) { this.error.set('Choose an Excel (.xlsx) or CSV file.'); return; }
    if (f && f.size > 5 * 1024 * 1024) { this.error.set('The file is larger than 5 MB. Split it into smaller files.'); return; }
    this.file.set(f);
  }
  setUpdate(v: boolean) { this.updateExisting.set(v); this.preview.set(null); }   // the preview depends on it

  async template() {
    this.busy.set(true);
    try { const f = await firstValueFrom(this.people.importTemplate()); saveBlob(f.blob, f.name); this.toast.show('Template downloaded.'); }
    catch (e) { this.error.set(errorText(e, 'Could not download the template.')); }
    finally { this.busy.set(false); }
  }

  async check() {
    const f = this.file(); if (!f) return;
    this.busy.set(true); this.error.set(null);
    try { this.preview.set(await firstValueFrom(this.people.previewImport(f, this.updateExisting()))); }
    catch (e) { this.error.set(errorText(e, 'Could not check this file.')); }
    finally { this.busy.set(false); }
  }

  async run() {
    const f = this.file(); if (!f) return;
    this.busy.set(true); this.error.set(null);
    try {
      const r = await firstValueFrom(this.people.runImport(f, this.updateExisting(), this.invite()));
      this.result.set(r);
      this.toast.show(`${r.added + r.updated} ${r.added + r.updated === 1 ? 'person' : 'people'} imported.`);
      window.scrollTo({ top: 0 });
    } catch (e) { this.error.set(errorText(e, 'The import did not finish. Check the file and try again.')); }
    finally { this.busy.set(false); }
  }

  downloadErrors(b64: string) { saveBlob(base64ToBlob(b64, XLSX), `${(this.file()?.name ?? 'import').replace(/\.(xlsx|csv)$/i, '')}-problems.xlsx`); }

  reset() { this.file.set(null); this.preview.set(null); this.result.set(null); this.error.set(null); }
}
