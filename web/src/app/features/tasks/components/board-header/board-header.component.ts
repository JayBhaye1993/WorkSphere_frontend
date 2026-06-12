import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDownload, LucidePlus, LucideSlidersHorizontal, LucideChevronDown } from '@lucide/angular';
import { ProjectDto } from '../../models/task.models';

@Component({
  selector: 'ws-board-header',
  standalone: true,
  imports: [CommonModule, LucideDownload, LucidePlus, LucideSlidersHorizontal, LucideChevronDown],
  template: `
    <div class="header">
      <div class="top-row">
        <div class="title-block">
          <div class="title-row">
            <h1 class="title">{{ project()?.name ?? 'My Tasks' }}</h1>
          </div>
          <p class="subtitle">
            @if (project()?.startDate) { {{ fmtDate(project()!.startDate!) }} – }
            @if (project()?.targetEndDate) { {{ fmtDate(project()!.targetEndDate!) }} · }
            {{ project()?.taskCount ?? 0 }} tasks
          </p>
        </div>
        <div class="actions">
          <button class="btn-ghost"><svg lucideDownload [size]="14"></svg> Export</button>
          <button class="btn-primary" (click)="newTask.emit()">
            <svg lucidePlus [size]="14"></svg> New Task
          </button>
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-chips">
          <button class="chip"><svg lucideSlidersHorizontal [size]="13"></svg> Filter</button>
          <button class="chip">Priority: <strong>All</strong> <svg lucideChevronDown [size]="12"></svg></button>
          <button class="chip">Group: <strong>Status</strong> <svg lucideChevronDown [size]="12"></svg></button>
        </div>
        <div class="view-toggle">
          <button class="toggle-btn active">Board</button>
          <button class="toggle-btn">List</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header{background:white;border-bottom:1px solid #e2e8f0;padding:16px 22px 12px;}
    .top-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;}
    .title-row{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
    .title{font-size:19px;font-weight:700;color:#0f172a;letter-spacing:-.02em;margin:0;}
    .subtitle{font-size:12.5px;color:#64748b;margin:0;}
    .actions{display:flex;gap:8px;align-items:center;}
    .btn-ghost{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;color:#475569;font-size:12.5px;font-weight:600;cursor:pointer;}
    .btn-ghost:hover{border-color:#cbd5e1;background:#f8fafc;}
    .btn-primary{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:8px;border:none;background:#4f46e5;color:white;font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 1px 4px rgba(79,70,229,.35);}
    .btn-primary:hover{background:#4338ca;}
    .filter-row{display:flex;align-items:center;gap:12px;}
    .filter-chips{display:flex;gap:6px;}
    .chip{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;font-size:12px;font-weight:500;color:#475569;cursor:pointer;}
    .chip strong{font-weight:700;color:#1e293b;}
    .chip:hover{border-color:#cbd5e1;background:#f8fafc;}
    .view-toggle{margin-left:auto;display:flex;background:#f1f5f9;border-radius:999px;padding:3px;gap:2px;}
    .toggle-btn{padding:4px 14px;border-radius:999px;border:none;background:none;font-size:12px;font-weight:500;color:#475569;cursor:pointer;}
    .toggle-btn.active{background:white;color:#4338ca;font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.06);}
  `]
})
export class BoardHeaderComponent {
  readonly project = input<ProjectDto | null>(null);
  readonly newTask = output<void>();
  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
