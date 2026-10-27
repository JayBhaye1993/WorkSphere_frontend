import { Component, computed, input, output } from '@angular/core';
import { OrgPerson } from '../../../core/models/people.models';
import { AvatarComponent } from '../../../shared/avatar.component';
import { OrgData, bandColor } from './org-data';

/** One box of the tree and, when open, the boxes below it (this component draws itself recursively). */
@Component({
  selector: 'ws-org-node',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    @let p = person();
    <div class="node-wrap">
      <button type="button" class="box" [class.hl]="highlight() === p.id" [attr.id]="'org-' + p.id" [style.border-top-color]="band()"
              (click)="openPerson.emit(p.id)" [attr.aria-label]="p.fullName + (p.designationName ? ', ' + p.designationName : '')">
        <ws-avatar [name]="p.fullName" [photo]="p.profilePhotoUrl" [size]="36" />
        <span class="min-w-0 flex flex-col text-left">
          <span class="text-[13px] font-semibold text-slate-900 truncate">{{ p.fullName }}</span>
          <span class="text-[12px] text-slate-600 truncate">{{ p.designationName || '—' }}</span>
          @if (p.departmentName) { <span class="text-[11px] text-slate-500 truncate">{{ p.departmentName }}</span> }
        </span>
      </button>
      @if (p.directReports) {
        <button type="button" class="toggle" (click)="toggle.emit(p.id)" [attr.aria-expanded]="isOpen()"
                [attr.aria-label]="(isOpen() ? 'Hide ' : 'Show ') + p.directReports + ' reports of ' + p.fullName">{{ isOpen() ? '−' : '+' + p.directReports }}</button>
      }
    </div>
    @if (isOpen() && kids().length) {
      <ul class="kids">
        @for (k of rowKids(); track k.id) {
          <li><ws-org-node [person]="k" [data]="data()" [open]="open()" [highlight]="highlight()" (toggle)="toggle.emit($event)" (openPerson)="openPerson.emit($event)" /></li>
        }
        @if (leaves().length) {
          <!-- People with no reports of their own, as one column instead of a wide row. -->
          <li><ul class="stack">
            @for (k of leaves(); track k.id) {
              <li><ws-org-node [person]="k" [data]="data()" [open]="open()" [highlight]="highlight()" (toggle)="toggle.emit($event)" (openPerson)="openPerson.emit($event)" /></li>
            }
          </ul></li>
        }
      </ul>
    }
  `,
  styles: [`
    :host { display:flex; flex-direction:column; align-items:center; }
    .node-wrap { display:flex; flex-direction:column; align-items:center; position:relative; }
    .box { width:184px; display:flex; align-items:center; gap:8px; padding:8px 10px; background:#fff; border:1px solid #e2e8f0; border-top:4px solid; border-radius:12px;
      box-shadow:0 1px 2px rgba(15,23,42,.06); cursor:pointer; font:inherit; }
    .box:hover { border-color:#a5b4fc; } .box:focus-visible { outline:2px solid #4f46e5; outline-offset:2px; }
    .hl { box-shadow:0 0 0 3px #f59e0b; }
    .toggle { margin-top:-1px; min-width:34px; height:22px; padding:0 8px; border-radius:999px; border:1px solid #cbd5e1; background:#fff; color:#334155;
      font-size:12px; font-weight:700; cursor:pointer; z-index:1; }
    .toggle:focus-visible { outline:2px solid #4f46e5; outline-offset:2px; }
    /* Connectors: a line down from the parent, a bar across the children, a line down into each child. */
    .stack { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; align-items:center; gap:10px; position:relative; }
    .stack::before { content:''; position:absolute; top:0; bottom:30px; left:50%; border-left:1.5px solid #94a3b8; }
    .stack > li { position:relative; z-index:1; }
    .kids { list-style:none; margin:0; padding:18px 0 0; display:flex; position:relative; }
    .kids::before { content:''; position:absolute; top:0; left:50%; height:18px; border-left:1.5px solid #94a3b8; }
    .kids > li { position:relative; padding:18px 8px 0; display:flex; justify-content:center; }
    .kids > li::before, .kids > li::after { content:''; position:absolute; top:0; width:50%; height:18px; border-top:1.5px solid #94a3b8; }
    .kids > li::before { right:50%; } .kids > li::after { left:50%; border-left:1.5px solid #94a3b8; }
    .kids > li:first-child::before, .kids > li:last-child::after { border:0 none; }
    .kids > li:last-child::before { border-right:1.5px solid #94a3b8; border-top-right-radius:8px; }
    .kids > li:first-child::after { border-top-left-radius:8px; }
    .kids > li:only-child::before, .kids > li:only-child::after { display:none; }
    .kids > li:only-child { padding-top:0; }
  `],
})
export class OrgNodeComponent {
  readonly person = input.required<OrgPerson>();
  readonly data = input.required<OrgData>();
  readonly open = input.required<ReadonlySet<string>>();
  readonly highlight = input<string | null>(null);
  readonly toggle = output<string>();
  readonly openPerson = output<string>();
  readonly isOpen = computed(() => this.open().has(this.person().id));
  readonly kids = computed(() => this.data().reports(this.person().id));
  readonly band = computed(() => bandColor(this.person().topDepartmentId));
  /** More than three reports without reports of their own go in a column; managers stay side by side. */
  readonly leaves = computed(() => { const l = this.kids().filter(k => !k.directReports); return l.length > 3 ? l : []; });
  readonly rowKids = computed(() => this.leaves().length ? this.kids().filter(k => k.directReports) : this.kids());
}
