import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucidePlus } from '@lucide/angular';
import { TaskCardComponent } from '../task-card/task-card.component';
import { KanbanColumn, TaskDto, TaskStatus } from '../../models/task.models';
import { TaskState } from '../../store/task.state';

@Component({
  selector: 'ws-kanban-column',
  standalone: true,
  imports: [CommonModule, TaskCardComponent, LucidePlus],
  template: `
    <div class="column" [class.drop-target]="state.dropTarget()===col().status"
      (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
      <div class="col-head">
        <div class="col-title-row">
          <span class="col-dot" [style.background]="col().dotColor"></span>
          <span class="col-title">{{ col().label }}</span>
          <span class="col-count mono">{{ col().tasks.length }}</span>
        </div>
        <div class="col-bar-wrap"><div class="col-bar" [style.background]="col().barColor" [style.width]="barWidth()"></div></div>
      </div>
      <div class="cards-body">
        @for (task of col().tasks; track task.id) {
          <ws-task-card [task]="task" (cardClick)="cardClick.emit($event)" />
        }
      </div>
      <button class="btn-add-task" (click)="addTask.emit(col().status)">
        <svg lucidePlus [size]="14"></svg> Add task
      </button>
    </div>
  `,
  styles: [`
    .column{width:282px;flex-shrink:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;flex-direction:column;transition:background .15s,border-color .15s;}
    .column.drop-target{background:#eef2ff;border:2px dashed #4f46e5;}
    .col-head{padding:11px 12px 9px;}
    .col-title-row{display:flex;align-items:center;gap:7px;margin-bottom:7px;}
    .col-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
    .col-title{font-size:12.5px;font-weight:600;color:#334155;flex:1;}
    .col-count{font-size:11px;font-weight:600;color:#475569;background:white;border:1px solid #e2e8f0;padding:1px 7px;border-radius:999px;min-width:22px;text-align:center;}
    .col-bar-wrap{height:3px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin:0 1px;}
    .col-bar{height:100%;border-radius:999px;transition:width .3s;}
    .cards-body{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:9px;max-height:calc(100vh - 280px);}
    .btn-add-task{margin:8px 10px 10px;padding:0 10px;height:32px;border:1.5px dashed #cbd5e1;border-radius:8px;background:none;color:#94a3b8;font-size:12.5px;font-weight:500;display:flex;align-items:center;gap:5px;cursor:pointer;transition:all .12s;}
    .btn-add-task:hover{border-color:#4f46e5;color:#4f46e5;background:#eef2ff;}
  `]
})
export class KanbanColumnComponent {
  readonly col=input.required<KanbanColumn>();readonly cardClick=output<TaskDto>();readonly addTask=output<TaskStatus>();readonly state=inject(TaskState);
  barWidth():string{return `min(100%, ${this.col().tasks.length*22}%)`;}
  onDragOver(e:DragEvent):void{e.preventDefault();this.state.setDropTarget(this.col().status);}
  onDragLeave(e:DragEvent):void{const rel=e.relatedTarget as HTMLElement;if(!rel||!(e.currentTarget as HTMLElement).contains(rel))this.state.setDropTarget(null);}
  onDrop(e:DragEvent):void{e.preventDefault();const id=e.dataTransfer?.getData('text/plain');if(id)this.state.moveTask(id,this.col().status);this.state.setDropTarget(null);}
}
