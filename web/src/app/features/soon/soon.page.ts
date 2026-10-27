import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Honest placeholder for sections built in a later round (no made-up numbers). */
@Component({
  standalone: true,
  template: `
    <div class="mx-auto max-w-[640px] px-4 pt-5 pb-10">
      <h1 class="m-0 text-[26px] font-bold tracking-tight">{{ data['title'] }}</h1>
      <p class="mt-3 text-[15px] leading-relaxed text-slate-600">{{ data['body'] }}</p>
    </div>
  `,
})
export class SoonPage {
  readonly data = inject(ActivatedRoute).snapshot.data;
}
