import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideCalendar, LucideMessageSquare, LucideLink, LucideLock } from '@lucide/angular';
import { TaskDto, TAG_CONFIG } from '../../models/task.models';
import { PriorityBadgeComponent } from '../priority-badge/priority-badge.component';
import { AiSuggestionChipComponent } from '../ai-suggestion-chip/ai-suggestion-chip.component';
import { TaskState } from '../../store/task.state';

@Component({
  selector: 'ws-task-card',
  standalone: true,
  imports: [CommonModule, PriorityBadgeComponent, AiSuggestionChipComponent,
    LucideCalendar, LucideMessageSquare, LucideLink, LucideLock],
  template: `
    <div class="card" [class.overdue]="task().dueState==='over'"
      draggable="true" (dragstart)="onDragStart($event)" (dragend)="onDragEnd($event)"
      (click)="cardClick.emit(task())">

      <div class="row-1">
        <ws-priority-badge [priority]="task().priority" />
        <span class="task-id mono">{{ shortId() }}</span>
      </div>

      <h4 class="title">{{ task().title }}</h4>

      @if (task().tags.length > 0) {
        <div class="tags">
          @for (tag of task().tags; track tag) {
            <span class="tag" [style.color]="tagCfg(tag).text" [style.background]="tagCfg(tag).bg">{{ tag }}</span>
          }
        </div>
      }

      @if (task().blockedBy) {
        <div class="blocked-callout">
          <svg lucideLock [size]="12"></svg>
          <span>Blocked by {{ task().blockedBy }}</span>
        </div>
      }

      @if (task().aiSuggestedPriority) {
        <ws-ai-chip [task]="task()" (apply)="state.applyAiSuggestion($event)" (dismiss)="state.dismissAiSuggestion($event)" />
      }

      @if (task().subTotal) {
        <div class="sub-row">
          <div class="sub-track"><div class="sub-fill" [style.width.%]="subPct()"></div></div>
          <span class="sub-lbl mono">{{ task().subDone }}/{{ task().subTotal }}</span>
        </div>
      }

      <div class="footer">
        @if (task().dueDate) {
          <div class="due" [class.soon]="task().dueState==='soon'" [class.over]="task().dueState==='over'">
            <svg lucideCalendar [size]="12"></svg>
            <span>{{ fmtDate(task().dueDate!) }}</span>
          </div>
        }
        <div class="meta-right">
          @if (task().commentCount) {
            <span class="meta-item"><svg lucideMessageSquare [size]="11"></svg><span class="mono">{{ task().commentCount }}</span></span>
          }
          @if (task().linkCount) {
            <span class="meta-item"><svg lucideLink [size]="11"></svg><span class="mono">{{ task().linkCount }}</span></span>
          }
          @if (task().assigneeId) {
            <span class="avatar" [style.background]="personColor()" [title]="task().assigneeId!">
              {{ task().assigneeId!.slice(0, 2).toUpperCase() }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:11px 11px 10px;cursor:grab;box-shadow:0 1px 2px rgba(15,23,42,.06);transition:border-color .12s,box-shadow .12s,transform .1s;border-left:3px solid transparent;}
    .card:hover{border-color:#cbd5e1;box-shadow:0 4px 12px rgba(15,23,42,.08);transform:translateY(-1px);}
    .card.dragging{opacity:.4;cursor:grabbing;}.card.overdue{border-left-color:#dc2626;}
    .row-1{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
    .task-id{font-size:10.5px;color:#94a3b8;}
    .title{font-size:13px;font-weight:600;color:#1e293b;margin:0 0 8px;line-height:1.35;}
    .tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;}
    .tag{padding:2px 7px;border-radius:5px;font-size:10.5px;font-weight:500;}
    .blocked-callout{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:7px;margin-bottom:8px;background:#fef2f2;border:1px solid #fee2e2;color:#dc2626;font-size:11px;font-weight:500;}
    .sub-row{display:flex;align-items:center;gap:6px;margin:8px 0;}
    .sub-track{flex:1;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;}
    .sub-fill{height:100%;background:#4f46e5;border-radius:2px;}
    .sub-lbl{font-size:10.5px;color:#94a3b8;}
    .footer{display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:9px;border-top:1px solid #eaeff4;}
    .due{display:flex;align-items:center;gap:4px;font-size:12px;color:#64748b;}
    .due.soon{color:#ea580c;}.due.over{color:#dc2626;font-weight:600;}
    .meta-right{display:flex;align-items:center;gap:5px;}
    .meta-item{display:flex;align-items:center;gap:3px;font-size:11px;color:#94a3b8;}
    .avatar{width:24px;height:24px;border-radius:50%;color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px white;flex-shrink:0;}
  `]
})
export class TaskCardComponent {
  readonly task      = input.required<TaskDto>();
  readonly cardClick = output<TaskDto>();
  readonly state     = inject(TaskState);

  private readonly colors = ['#4f46e5','#2563eb','#0d9488','#d97706','#e11d48','#7c3aed','#16a34a'];

  shortId(): string {
    return this.task().id.slice(-8).toUpperCase();
  }
  tagCfg(tag: string): { text: string; bg: string } {
    return TAG_CONFIG[tag.toLowerCase()] ?? TAG_CONFIG['default'];
  }
  personColor(): string {
    const id = this.task().assigneeId ?? '';
    return this.colors[id.charCodeAt(0) % this.colors.length] ?? '#4f46e5';
  }
  subPct(): number {
    const t = this.task();
    if (!t.subTotal) return 0;
    return Math.round(((t.subDone ?? 0) / t.subTotal) * 100);
  }
  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  onDragStart(e: DragEvent): void {
    e.dataTransfer?.setData('text/plain', this.task().id);
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }
  onDragEnd(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  }
}


