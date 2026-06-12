import { Component, input } from '@angular/core';
import { TaskPriority, PRIORITY_CONFIG } from '../../models/task.models';

@Component({
  selector: 'ws-priority-badge',
  standalone: true,
  template: `
    <span class="badge"
      [style.color]="cfg().text"
      [style.background]="cfg().bg">
      <span class="swatch" [style.background]="cfg().swatch"></span>
      {{ cfg().label }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 7px; border-radius: 6px;
      font-size: 10.5px; font-weight: 700; letter-spacing: .01em;
    }
    .swatch { width: 6px; height: 6px; border-radius: 2px; flex-shrink: 0; }
  `]
})
export class PriorityBadgeComponent {
  readonly priority = input.required<TaskPriority>();
  readonly cfg = () => PRIORITY_CONFIG[this.priority()];
}
