import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { TaskState } from '../../store/task.state';
import { CreateTaskRequest, TaskPriority } from '../../models/task.models';

@Component({
  selector: 'ws-new-task-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX],
  template: `
    @if (visible()) {
      <div class="backdrop" (click)="close.emit()"></div>
      <div class="panel" role="dialog">
        <div class="panel-header">
          <h3>New Task</h3>
          <button class="close-btn" (click)="close.emit()"><svg lucideX [size]="18"></svg></button>
        </div>
        <div class="panel-body">
          <div class="field"><label class="lbl">Title *</label>
            <input class="inp" [(ngModel)]="title" placeholder="What needs to be done?" maxlength="500" /></div>
          <div class="field"><label class="lbl">Description</label>
            <textarea class="inp" [(ngModel)]="description" placeholder="Add details..." rows="3"></textarea></div>
          <div class="field-row">
            <div class="field"><label class="lbl">Priority</label>
              <select class="inp" [(ngModel)]="priority">
                <option value="Critical">Critical</option><option value="High">High</option>
                <option value="Medium">Medium</option><option value="Low">Low</option>
              </select></div>
            <div class="field"><label class="lbl">Due Date</label>
              <input class="inp" type="date" [(ngModel)]="dueDate" /></div>
          </div>
          <div class="field"><label class="lbl">Estimated Hours</label>
            <input class="inp" type="number" [(ngModel)]="estimatedHours" min="0.5" step="0.5" placeholder="e.g. 4" /></div>
          <div class="field"><label class="lbl">Tags (comma separated)</label>
            <input class="inp" [(ngModel)]="tagsInput" placeholder="e.g. Auth, Backend" /></div>
        </div>
        <div class="panel-footer">
          <button class="btn-cancel" (click)="close.emit()">Cancel</button>
          <button class="btn-create" [disabled]="!title.trim()" (click)="submit()">Create Task</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop{position:fixed;inset:0;background:rgba(15,23,42,.3);z-index:200;}
    .panel{position:fixed;top:0;right:0;bottom:0;width:480px;background:white;z-index:201;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(15,23,42,.08),-8px 0 32px rgba(15,23,42,.12);animation:slideIn .2s cubic-bezier(.16,1,.3,1);}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .panel-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #e2e8f0;}
    .panel-header h3{margin:0;font-size:16px;font-weight:700;color:#0f172a;}
    .close-btn{background:none;border:none;cursor:pointer;color:#94a3b8;display:flex;align-items:center;padding:4px;border-radius:6px;transition:background .12s;}
    .close-btn:hover{background:#f1f5f9;color:#334155;}
    .panel-body{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:18px;}
    .field{display:flex;flex-direction:column;gap:6px;}.lbl{font-size:12.5px;font-weight:600;color:#334155;}
    .inp{padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;font-family:inherit;outline:none;transition:border-color .12s,box-shadow .12s;}
    .inp:focus{border-color:#4f46e5;box-shadow:0 0 0 3px #eef2ff;}textarea.inp{resize:vertical;}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .panel-footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid #e2e8f0;}
    .btn-cancel{padding:8px 16px;border:1.5px solid #e2e8f0;border-radius:8px;background:white;color:#475569;font-size:12.5px;font-weight:600;cursor:pointer;}
    .btn-cancel:hover{border-color:#cbd5e1;background:#f8fafc;}
    .btn-create{padding:8px 20px;border:none;border-radius:8px;background:#4f46e5;color:white;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .12s;}
    .btn-create:hover:not(:disabled){background:#4338ca;}.btn-create:disabled{opacity:.5;cursor:not-allowed;}
  `]
})
export class NewTaskDialogComponent {
  readonly visible=input.required<boolean>();readonly projectId=input<string>('');readonly close=output<void>();
  private readonly state=inject(TaskState);
  title='';description='';priority:TaskPriority='Medium';dueDate='';estimatedHours:number|null=null;tagsInput='';
  submit():void{
    if(!this.title.trim())return;
    this.state.createTask({projectId:this.projectId(),title:this.title.trim(),description:this.description.trim()||null,assigneeId:null,dueDate:this.dueDate||null,priority:this.priority,estimatedHours:this.estimatedHours,tags:this.tagsInput.split(',').map(t=>t.trim()).filter(Boolean),parentTaskId:null});
    this.title='';this.description='';this.priority='Medium';this.dueDate='';this.estimatedHours=null;this.tagsInput='';
    this.close.emit();
  }
}
