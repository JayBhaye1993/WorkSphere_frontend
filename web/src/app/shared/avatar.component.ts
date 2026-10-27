import { Component, computed, effect, input, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const TINTS: [string, string][] = [
  ['#e0e7ff', '#3730a3'], ['#ccfbf1', '#115e59'], ['#ffedd5', '#9a3412'],
  ['#fce7f3', '#9d174d'], ['#e2e8f0', '#1e293b'], ['#dbeafe', '#1e40af'],
];

/** Where a stored photo name is served from (full URLs are used as they are). */
export function photoUrl(photo: string | null | undefined): string | null {
  if (!photo) return null;
  return /^(https?:|data:|blob:|\/)/.test(photo) ? photo : `${environment.apiUrls.employee}/api/v1/photos/${photo}`;
}

/** Initials (or photo) in a circle. The colour is stable per name. Decorative: the name is always shown next to it. */
@Component({
  selector: 'ws-avatar',
  standalone: true,
  template: `
    @if (src() && !broken()) {
      <img [src]="src()" alt="" loading="lazy" (error)="broken.set(true)" [style.width.px]="size()" [style.height.px]="size()" class="rounded-full object-cover shrink-0">
    } @else {
      <span aria-hidden="true" class="rounded-full shrink-0 inline-flex items-center justify-center font-bold"
            [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.36"
            [style.background]="tint()[0]" [style.color]="tint()[1]">{{ initials() }}</span>
    }
  `,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly photo = input<string | null>(null);
  readonly size = input(40);
  /** A stored photo name ("3f…9a.jpg") becomes the photo address; full URLs are used as they are. */
  readonly src = computed(() => photoUrl(this.photo()));
  readonly broken = signal(false);
  constructor() { effect(() => { this.src(); this.broken.set(false); }, { allowSignalWrites: true }); }
  readonly initials = computed(() =>
    this.name().trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase());
  readonly tint = computed(() => {
    let h = 0;
    for (const c of this.name()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return TINTS[h % TINTS.length];
  });
}
