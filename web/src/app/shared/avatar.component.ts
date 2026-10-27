import { Component, computed, input } from '@angular/core';

const TINTS: [string, string][] = [
  ['#e0e7ff', '#3730a3'], ['#ccfbf1', '#115e59'], ['#ffedd5', '#9a3412'],
  ['#fce7f3', '#9d174d'], ['#e2e8f0', '#1e293b'], ['#dbeafe', '#1e40af'],
];

/** Initials (or photo) in a circle. The colour is stable per name. Decorative: the name is always shown next to it. */
@Component({
  selector: 'ws-avatar',
  standalone: true,
  template: `
    @if (photo()) {
      <img [src]="photo()" alt="" [style.width.px]="size()" [style.height.px]="size()" class="rounded-full object-cover shrink-0">
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
  readonly initials = computed(() =>
    this.name().trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase());
  readonly tint = computed(() => {
    let h = 0;
    for (const c of this.name()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return TINTS[h % TINTS.length];
  });
}
