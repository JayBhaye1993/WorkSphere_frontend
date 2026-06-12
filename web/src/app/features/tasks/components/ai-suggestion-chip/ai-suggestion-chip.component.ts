import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideSparkles, LucideCheck, LucideX } from '@lucide/angular';
import { TaskDto, PRIORITY_CONFIG } from '../../models/task.models';

@Component({
  selector: 'ws-ai-chip',
  standalone: true,
  imports: [CommonModule, LucideSparkles, LucideCheck, LucideX],
  template: `
    @if (task().aiSuggestedPriority) {
      <div class="chip" [class.flag]="task().aiFlag">
        <svg lucideSparkles [size]="12" class="chip-icon"></svg>
        @if (task().aiFlag) {
          <span class="chip-text">
            AI suggests <strong [style.color]="priColor()">{{ task().aiSuggestedPriority }}</strong>
            @if (task().aiWhy) { — {{ task().aiWhy }} }
          </span>
          <div class="chip-actions">
            <button class="chip-btn apply" title="Apply" (click)="$event.stopPropagation(); apply.emit(task().id)">
              <svg lucideCheck [size]="11"></svg>
            </button>
            <button class="chip-btn dismiss" title="Dismiss" (click)="$event.stopPropagation(); dismiss.emit(task().id)">
              <svg lucideX [size]="11"></svg>
            </button>
          </div>
        } @else {
          <span class="chip-text">AI agrees · <strong style="color:#4338ca">{{ task().aiSuggestedPriority }}</strong> priority</span>
        }
      </div>
    }
  `,
  styles: [`
    .chip{display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:7px;margin-top:8px;font-size:11px;background:linear-gradient(90deg,#eef2ff,#f5f3ff);border:1px solid #e0e7ff;}
    .chip.flag{background:linear-gradient(90deg,#fff7ed,#fef2f2);border-color:#fed7aa;}
    .chip-icon{color:#4f46e5;flex-shrink:0;}.chip.flag .chip-icon{color:#ea580c;}
    .chip-text{flex:1;color:#334155;line-height:1.3;}
    .chip-actions{display:flex;gap:3px;margin-left:auto;}
    .chip-btn{width:22px;height:22px;border-radius:6px;border:1px solid #e2e8f0;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;transition:all .12s;}
    .chip-btn.apply:hover{border-color:#16a34a;color:#16a34a;}.chip-btn.dismiss:hover{border-color:#94a3b8;color:#334155;}
  `]
})
export class AiSuggestionChipComponent {
  readonly task    = input.required<TaskDto>();
  readonly apply   = output<string>();
  readonly dismiss = output<string>();
  priColor(): string { const p = this.task().aiSuggestedPriority; return p ? PRIORITY_CONFIG[p].text : '#334155'; }
}
