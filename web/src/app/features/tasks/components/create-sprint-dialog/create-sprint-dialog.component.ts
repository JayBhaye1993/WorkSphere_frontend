import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { TaskState } from '../../store/task.state';

@Component({
  selector: 'ws-create-sprint-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX],
  template: `
    @if (visible()) {
      <div class="backdrop" (click)="close.emit()"></div>
      <div class="panel" role="dialog">
        <div class="panel-header">
          <h3>New Sprint</h3>
          <button class="close-btn" (click)="close.emit()">
            <svg lucideX [size]="18"></svg>
          </button>
        </div>
        <div class="panel-body">

          <div class="field">
            <label class="lbl">Sprint name <span class="req">*</span></label>
            <input class="inp" [(ngModel)]="name"
              placeholder="e.g. Sprint 1 — Auth & Onboarding" maxlength="200" />
          </div>

          <div class="field">
            <label class="lbl">Sprint goal <span class="hint">(optional)</span></label>
            <textarea class="inp" [(ngModel)]="goal" rows="3"
              placeholder="What should this sprint achieve?"></textarea>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="lbl">Start date <span class="req">*</span></label>
              <input class="inp" type="date" [(ngModel)]="startDate" />
            </div>
            <div class="field">
              <label class="lbl">End date <span class="req">*</span></label>
              <input class="inp" type="date" [(ngModel)]="endDate" />
            </div>
          </div>

          @if (durationDays() > 0) {
            <div class="duration-hint">
              {{ durationDays() }} day sprint
              @if (durationDays() < 7) { <span class="warn">· shorter than recommended (7–14 days)</span> }
              @if (durationDays() > 21) { <span class="warn">· longer than recommended (7–14 days)</span> }
            </div>
          }

        </div>
        <div class="panel-footer">
          <button class="btn-cancel" (click)="close.emit()">Cancel</button>
          <button class="btn-create" [disabled]="!isValid()" (click)="submit()">
            Create Sprint
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop{position:fixed;inset:0;background:rgba(15,23,42,.3);z-index:200;}
    .panel{position:fixed;top:0;right:0;bottom:0;width:480px;background:white;z-index:201;
      display:flex;flex-direction:column;
      box-shadow:0 0 0 1px rgba(15,23,42,.08),-8px 0 32px rgba(15,23,42,.12);
      animation:slideIn .2s cubic-bezier(.16,1,.3,1);}
    @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
    .panel-header{display:flex;justify-content:space-between;align-items:center;
      padding:20px 24px;border-bottom:1px solid #e2e8f0;}
    .panel-header h3{margin:0;font-size:16px;font-weight:700;color:#0f172a;}
    .close-btn{background:none;border:none;cursor:pointer;color:#94a3b8;
      display:flex;align-items:center;padding:4px;border-radius:6px;transition:background .12s;}
    .close-btn:hover{background:#f1f5f9;color:#334155;}
    .panel-body{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:18px;}
    .field{display:flex;flex-direction:column;gap:6px;}
    .lbl{font-size:12.5px;font-weight:600;color:#334155;}
    .req{color:#dc2626;}
    .hint{font-weight:400;color:#94a3b8;font-size:11.5px;}
    .inp{padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;
      color:#0f172a;font-family:inherit;outline:none;transition:border-color .12s,box-shadow .12s;}
    .inp:focus{border-color:#4f46e5;box-shadow:0 0 0 3px #eef2ff;}
    textarea.inp{resize:vertical;}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .duration-hint{font-size:12px;color:#475569;padding:8px 12px;
      background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;}
    .warn{color:#d97706;}
    .panel-footer{display:flex;justify-content:flex-end;gap:10px;
      padding:16px 24px;border-top:1px solid #e2e8f0;}
    .btn-cancel{padding:8px 16px;border:1.5px solid #e2e8f0;border-radius:8px;
      background:white;color:#475569;font-size:12.5px;font-weight:600;cursor:pointer;}
    .btn-cancel:hover{border-color:#cbd5e1;background:#f8fafc;}
    .btn-create{padding:8px 20px;border:none;border-radius:8px;background:#4f46e5;
      color:white;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .12s;}
    .btn-create:hover:not(:disabled){background:#4338ca;}
    .btn-create:disabled{opacity:.5;cursor:not-allowed;}
  `]
})
export class CreateSprintDialogComponent {
  readonly visible   = input(false);
  readonly projectId = input('');
  readonly close     = output<void>();

  private readonly state = inject(TaskState);

  name      = '';
  goal      = '';
  startDate = '';
  endDate   = '';

  durationDays(): number {
    if (!this.startDate || !this.endDate) return 0;
    const diff = new Date(this.endDate).getTime() - new Date(this.startDate).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  isValid(): boolean {
    return !!this.name.trim() && !!this.startDate && !!this.endDate
      && this.durationDays() > 0;
  }

  submit(): void {
    if (!this.isValid()) return;
    this.state.createSprint({
      projectId: this.projectId(),
      name:      this.name.trim(),
      goal:      this.goal.trim() || null,
      startDate: this.startDate,
      endDate:   this.endDate
    });
    this.reset();
    this.close.emit();
  }

  private reset(): void {
    this.name = '';
    this.goal = '';
    this.startDate = '';
    this.endDate = '';
  }
}
