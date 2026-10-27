import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideEllipsis, LucideFile, LucideFileText, LucideImage, LucideLock, LucidePlus, LucideX } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { PersonDocument, PersonDocuments } from '../../../core/models/people.models';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';
import { saveBlob } from '../../../core/util/download';

/** A person's documents, grouped by type: what the viewer may see, download, add and remove. */
@Component({
  selector: 'ws-documents',
  standalone: true,
  imports: [LucideFileText, LucideImage, LucideFile, LucideLock, LucidePlus, LucideEllipsis, LucideX],
  template: `
    @if (data(); as d) {
      @if (d.documents.length || d.canUploadTo.length) {
        <section class="card" aria-labelledby="docs-h">
          <div class="flex items-center gap-2">
            <h2 id="docs-h" class="card-h flex-1">Documents</h2>
            @if (d.canUploadTo.length) {
              <button type="button" (click)="openAdd()" class="min-h-[44px] -my-3 flex items-center gap-1 bg-transparent border-0 p-0 text-[14px] font-semibold text-indigo-700 cursor-pointer"><svg lucidePlus [size]="16" aria-hidden="true"></svg>Add</button>
            }
          </div>
          @if (!d.documents.length) { <p class="m-0 text-[14px] text-slate-600">No documents yet.@if (self()) { You can add {{ uploadNames() }}.}</p> }
          @for (g of groups(); track g.name) {
            <div class="flex flex-col">
              <h3 class="m-0 mb-1 text-[12px] font-semibold text-slate-500 flex items-center gap-1">
                @if (g.visibility === 'HR') { <svg lucideLock [size]="11" aria-label="HR only"></svg> }{{ g.name }}</h3>
              <ul class="list-none m-0 p-0">
                @for (x of g.items; track x.id) {
                  <li class="flex items-center gap-1 border-b border-slate-100 last:border-b-0">
                    <button type="button" (click)="download(x)" [disabled]="busy() === x.id" class="flex-1 min-w-0 min-h-[52px] flex items-center gap-3 bg-transparent border-0 p-0 text-left cursor-pointer">
                      <span class="w-9 h-9 shrink-0 rounded-10 flex items-center justify-center" [class]="iconTint(x)">
                        @if (x.contentType === 'application/pdf') { <svg lucideFileText [size]="18" aria-hidden="true"></svg> }
                        @else if (x.contentType.startsWith('image/')) { <svg lucideImage [size]="18" aria-hidden="true"></svg> }
                        @else { <svg lucideFile [size]="18" aria-hidden="true"></svg> }
                      </span>
                      <span class="min-w-0 flex flex-col">
                        <span class="text-[14px] font-semibold text-slate-900 truncate">{{ busy() === x.id ? 'Downloading…' : x.title }}</span>
                        <span class="text-[12px] text-slate-600 truncate">{{ size(x.sizeBytes) }} · {{ day(x.uploadedAt) }} · {{ x.uploadedByName }}</span>
                      </span>
                    </button>
                    @if (x.canDelete) {
                      <button type="button" (click)="askDelete(x)" [attr.aria-label]="'Remove ' + x.title" class="w-11 h-11 flex items-center justify-center rounded-full bg-transparent border-0 text-slate-600 hover:bg-slate-100 cursor-pointer"><svg lucideEllipsis [size]="18" aria-hidden="true"></svg></button>
                    }
                  </li>
                }
              </ul>
            </div>
          }
        </section>
      }
    }

    @if (sheet(); as s) {
      <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="close()" (keydown.escape)="close()">
        <section #dialog role="dialog" aria-modal="true" [attr.aria-label]="s.kind === 'add' ? 'Add a document' : 'Remove document'" tabindex="-1" (click)="$event.stopPropagation()"
                 class="w-full lg:max-w-[480px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4 outline-none">
          <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
          <div class="flex items-center gap-2">
            <h2 class="m-0 flex-1 text-[19px] font-bold">{{ s.kind === 'add' ? 'Add a document' : 'Remove ' + s.doc.title + '?' }}</h2>
            <button type="button" (click)="close()" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
          </div>
          @if (sheetError()) { <div class="ws-alert" role="alert">{{ sheetError() }}</div> }
          @if (s.kind === 'add') {
            <label class="ws-field">Type
              <select class="ws-input" (change)="category.set($any($event.target).value)">
                @for (c of data()!.canUploadTo; track c.id) { <option [value]="c.id" [selected]="c.id === category()">{{ c.name }}{{ c.visibility === 'HR' ? ' (HR only)' : '' }}</option> }
              </select>
              <span class="hint">{{ visibilityHint() }}</span>
            </label>
            <label class="pick" [class.pick-on]="!!file()">
              <span class="flex-1 min-w-0 flex flex-col">
                <span class="text-[15px] font-semibold truncate">{{ file()?.name ?? 'Choose a file or take a photo' }}</span>
                <span class="text-[12px] text-slate-600">{{ file() ? size(file()!.size) + ' · tap to change' : 'PDF, image, Word or Excel · up to 10 MB' }}</span>
              </span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,image/*,application/pdf" class="sr-only" (change)="choose($any($event.target))">
            </label>
            <label class="ws-field"><span>Title <span class="font-normal text-slate-600">· optional</span></span>
              <input class="ws-input" maxlength="200" [value]="title()" (input)="title.set($any($event.target).value)" placeholder="Defaults to the file name">
            </label>
            <button type="button" (click)="upload()" [disabled]="working() || !file()" class="ws-btn ws-btn-primary">{{ working() ? 'Uploading…' : 'Upload' }}</button>
          } @else {
            <p class="m-0 text-[15px] text-slate-700">The file is deleted. The history keeps a note that it was removed.</p>
            <button type="button" (click)="remove(s.doc)" [disabled]="working()" class="ws-btn text-white bg-red-600 hover:opacity-90">{{ working() ? 'Removing…' : 'Remove' }}</button>
            <button type="button" (click)="close()" class="ws-btn ws-btn-ghost">Keep it</button>
          }
        </section>
      </div>
    }
  `,
  styles: [`
    .card { padding:14px 16px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; display:flex; flex-direction:column; gap:10px; }
    .card-h { margin:0; font-size:13px; font-weight:600; color:#475569; text-transform:uppercase; letter-spacing:.06em; }
    .pick { display:flex; align-items:center; gap:12px; min-height:60px; padding:10px 14px; border:2px dashed #cbd5e1; border-radius:14px; cursor:pointer; background:#fff; }
    .pick-on { border-style:solid; border-color:#4f46e5; background:#eef2ff; }
    .pick:focus-within { outline:2px solid #4f46e5; outline-offset:2px; }
  `],
})
export class DocumentsComponent {
  readonly employeeId = input.required<string>();
  /** The viewer is this person (wording only). */
  readonly self = input(false);
  private readonly people = inject(PeopleService);
  private readonly toast = inject(ToastService);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  readonly data = signal<PersonDocuments | null>(null);
  readonly busy = signal<string | null>(null);
  readonly sheet = signal<{ kind: 'add' } | { kind: 'delete'; doc: PersonDocument } | null>(null);
  readonly working = signal(false);
  readonly sheetError = signal<string | null>(null);
  readonly category = signal('');
  readonly file = signal<File | null>(null);
  readonly title = signal('');

  readonly groups = computed(() => {
    const map = new Map<string, { name: string; visibility: string; items: PersonDocument[] }>();
    for (const x of this.data()?.documents ?? []) {
      const g = map.get(x.categoryName) ?? { name: x.categoryName, visibility: x.visibility, items: [] };
      g.items.push(x); map.set(x.categoryName, g);
    }
    return [...map.values()];
  });
  readonly uploadNames = computed(() => (this.data()?.canUploadTo ?? []).map(c => c.name.toLowerCase()).join(', '));
  readonly visibilityHint = computed(() => {
    const v = this.data()?.canUploadTo.find(c => c.id === this.category())?.visibility;
    return v === 'HR' ? 'Only HR can see it.' : v === 'HR and employee' ? `HR and ${this.self() ? 'you' : 'the person'} can see it.` : v ? `HR, ${this.self() ? 'you' : 'the person'} and ${this.self() ? 'your' : 'their'} managers can see it.` : '';
  });

  constructor() {
    effect(() => { const id = this.employeeId(); untracked(() => void this.load(id)); });
    effect(() => { const el = this.dialog()?.nativeElement; if (el) setTimeout(() => ((el.querySelector('select,input') ?? el) as HTMLElement).focus(), 0); });
  }

  private async load(id: string) {
    try { this.data.set(await firstValueFrom(this.people.documents(id))); } catch { this.data.set(null); }
  }

  size(b: number) { return b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`; }
  day(iso: string) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  iconTint(x: PersonDocument) { return x.contentType === 'application/pdf' ? 'bg-red-50 text-red-700' : x.contentType.startsWith('image/') ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'; }

  async download(x: PersonDocument) {
    this.busy.set(x.id);
    try { const f = await firstValueFrom(this.people.downloadDocument(this.employeeId(), x)); saveBlob(f.blob, f.name); }
    catch (e) { this.toast.show(errorText(e, 'Could not download the file.')); }
    finally { this.busy.set(null); }
  }

  openAdd() {
    this.sheetError.set(null); this.file.set(null); this.title.set('');
    this.category.set(this.data()?.canUploadTo[0]?.id ?? '');
    this.sheet.set({ kind: 'add' });
  }
  askDelete(doc: PersonDocument) { this.sheetError.set(null); this.sheet.set({ kind: 'delete', doc }); }
  close() { if (!this.working()) this.sheet.set(null); }

  choose(input: HTMLInputElement) {
    const f = input.files?.[0] ?? null; input.value = '';
    this.sheetError.set(null);
    if (f && f.size > 10 * 1024 * 1024) { this.sheetError.set('The file is larger than 10 MB.'); return; }
    this.file.set(f);
  }

  async upload() {
    const f = this.file(); if (!f || !this.category()) return;
    this.working.set(true); this.sheetError.set(null);
    try {
      await firstValueFrom(this.people.uploadDocument(this.employeeId(), f, this.category(), this.title().trim() || null));
      this.toast.show('Document added.');
      this.working.set(false); this.sheet.set(null);
      await this.load(this.employeeId());
    } catch (e) { this.sheetError.set(errorText(e, 'Could not upload the file.')); this.working.set(false); }
  }

  async remove(doc: PersonDocument) {
    this.working.set(true);
    try {
      await firstValueFrom(this.people.deleteDocument(this.employeeId(), doc.id));
      this.toast.show('Document removed.');
      this.working.set(false); this.sheet.set(null);
      await this.load(this.employeeId());
    } catch (e) { this.sheetError.set(errorText(e, 'Could not remove the document.')); this.working.set(false); }
  }
}
