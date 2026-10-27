import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideCamera, LucideTrash2, LucideX } from '@lucide/angular';
import { PeopleService } from '../people.service';
import { ToastService } from '../../../core/services/toast.service';
import { errorText } from '../people-errors';
import { AvatarComponent } from '../../../shared/avatar.component';

/** Square-crops and shrinks a picture on the device (512 × 512 JPEG) so uploads are small and fast. */
export async function squarePhoto(file: File, size = 512): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('not an image')); i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return await new Promise<Blob>((ok, bad) => canvas.toBlob(b => b ? ok(b) : bad(new Error('could not encode')), 'image/jpeg', 0.86));
  } finally { URL.revokeObjectURL(url); }
}

/** Change or remove a profile photo (yours, or someone you may edit). */
@Component({
  selector: 'ws-photo-sheet',
  standalone: true,
  imports: [AvatarComponent, LucideCamera, LucideTrash2, LucideX],
  template: `
    <div class="fixed inset-0 z-40 bg-slate-900/45 flex items-end lg:items-center justify-center" (click)="close()" (keydown.escape)="close()">
      <section #dialog role="dialog" aria-modal="true" aria-label="Profile photo" tabindex="-1" (click)="$event.stopPropagation()"
               class="w-full lg:max-w-[420px] bg-white rounded-t-[20px] lg:rounded-[20px] px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-4 outline-none">
        <span aria-hidden="true" class="lg:hidden self-center w-10 h-1 rounded-full bg-slate-300"></span>
        <div class="flex items-center gap-2">
          <h2 class="m-0 flex-1 text-[19px] font-bold">Profile photo</h2>
          <button type="button" (click)="close()" aria-label="Close" class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-slate-100 cursor-pointer"><svg lucideX [size]="20" aria-hidden="true"></svg></button>
        </div>
        <div class="self-center"><ws-avatar [name]="name()" [photo]="preview() ?? photo()" [size]="120" /></div>
        @if (error()) { <div class="ws-alert" role="alert">{{ error() }}</div> }
        <label class="ws-btn ws-btn-primary flex items-center justify-center gap-2 cursor-pointer" [class.opacity-60]="busy()">
          <svg lucideCamera [size]="18" aria-hidden="true"></svg>{{ busy() ? 'Uploading…' : photo() ? 'Choose a new photo' : 'Add a photo' }}
          <input type="file" accept="image/*" class="sr-only" [disabled]="busy()" (change)="pick($any($event.target))">
        </label>
        @if (photo()) {
          <button type="button" (click)="remove()" [disabled]="busy()" class="ws-btn ws-btn-ghost flex items-center justify-center gap-2 !text-red-700"><svg lucideTrash2 [size]="18" aria-hidden="true"></svg>Remove photo</button>
        }
        <p class="m-0 text-[12px] text-slate-600 text-center">Everyone in the company sees it next to {{ self() ? 'your' : 'their' }} name.</p>
      </section>
    </div>
  `,
})
export class PhotoSheetComponent {
  /** null = your own photo. */
  readonly employeeId = input<string | null>(null);
  readonly name = input.required<string>();
  readonly photo = input<string | null>(null);
  readonly self = input(true);
  readonly closed = output<void>();
  /** The new stored photo name, or null when removed. */
  readonly changed = output<string | null>();

  private readonly people = inject(PeopleService);
  private readonly toast = inject(ToastService);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<string | null>(null);

  constructor() { effect(() => { const el = this.dialog()?.nativeElement; if (el) setTimeout(() => el.focus(), 0); }); }

  close() { if (!this.busy()) this.closed.emit(); }

  async pick(input: HTMLInputElement) {
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.error.set('Choose a picture (JPG, PNG or WebP).'); return; }
    this.busy.set(true); this.error.set(null);
    try {
      const blob = await squarePhoto(file);
      this.preview.set(URL.createObjectURL(blob));
      const name = await firstValueFrom(this.people.setPhoto(this.employeeId(), blob));
      this.toast.show('Photo updated.');
      this.changed.emit(name);
      this.closed.emit();
    } catch (e) {
      this.preview.set(null);
      this.error.set(e instanceof Error && e.message === 'not an image' ? 'This picture could not be opened. Try a JPG or PNG.' : errorText(e, 'Could not upload the photo.'));
    } finally { this.busy.set(false); }
  }

  async remove() {
    this.busy.set(true); this.error.set(null);
    try { await firstValueFrom(this.people.removePhoto(this.employeeId())); this.toast.show('Photo removed.'); this.changed.emit(null); this.closed.emit(); }
    catch (e) { this.error.set(errorText(e, 'Could not remove the photo.')); }
    finally { this.busy.set(false); }
  }
}
