import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDownload, LucidePlus, LucideSlidersHorizontal, LucideChevronDown, LucideZap, LucideAlertTriangle } from '@lucide/angular';
import { ProjectDto, ProjectMemberDto, SprintSummaryDto } from '../../models/task.models';

@Component({
  selector: 'ws-board-header',
  standalone: true,
  imports: [CommonModule, LucideDownload, LucidePlus, LucideSlidersHorizontal, LucideChevronDown, LucideZap, LucideAlertTriangle],
  template: `
    <div class="header">
      <div class="top-row">
        <div class="title-block">
          <div class="title-row">
            <h1 class="title">{{ project()?.name ?? 'My Tasks' }}</h1>
            @if (activeSprint()) {
              <span class="sprint-badge" [class]="riskClass()">
                <svg lucideZap [size]="12"></svg>
                {{ activeSprint()!.name }}
                @if (activeSprint()!.daysRemaining > 0) {
                  · {{ activeSprint()!.daysRemaining }} days left
                } @else {
                  · Overdue
                }
              </span>
            }
          </div>
          <p class="subtitle">
            @if (project()?.startDate) { {{ fmtDate(project()!.startDate!) }} – }
            @if (project()?.targetEndDate) { {{ fmtDate(project()!.targetEndDate!) }} · }
            {{ project()?.taskCount ?? 0 }} tasks
            @if (activeSprint()) {
              · {{ activeSprint()!.completionPercentage | number:'1.0-0' }}% complete
            }
          </p>
        </div>
        <div class="actions">
          <button class="btn-ghost" (click)="newSprint.emit()">
            <svg lucidePlus [size]="14"></svg> New Sprint
          </button>
          <button class="btn-primary" (click)="newTask.emit()">
            <svg lucidePlus [size]="14"></svg> New Task
          </button>
        </div>
      </div>

      @if (activeSprint() && activeSprint()!.aiRiskLevel !== 'None') {
        <div class="risk-banner" [class]="'risk-' + activeSprint()!.aiRiskLevel.toLowerCase()">
          <svg lucideAlertTriangle [size]="14"></svg>
          <strong>{{ activeSprint()!.aiRiskLevel }} Risk</strong>
          — AI Scrum Master has flagged this sprint. Check the sprint health panel.
        </div>
      }

      <div class="filter-row">
        <div class="filter-chips">
          <button class="chip"><svg lucideSlidersHorizontal [size]="13"></svg> Filter</button>
          <button class="chip">Priority: <strong>All</strong> <svg lucideChevronDown [size]="12"></svg></button>
          <button class="chip">Group: <strong>Status</strong> <svg lucideChevronDown [size]="12"></svg></button>
        </div>

        @if (members().length > 0) {
          <div class="avatar-strip">
            @for (m of visibleMembers(); track m.employeeId) {
              <div class="avatar"
                [style.background]="avatarColor(m.employeeId)"
                [title]="m.fullName + ' · ' + m.role">
                {{ initial(m.fullName) }}
              </div>
            }
            @if (overflowCount() > 0) {
              <div class="avatar avatar-overflow">+{{ overflowCount() }}</div>
            }
          </div>
        }

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
    .title-row{display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;}
    .title{font-size:19px;font-weight:700;color:#0f172a;letter-spacing:-.02em;margin:0;}
    .subtitle{font-size:12.5px;color:#64748b;margin:0;}

    /* Sprint badge */
    .sprint-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;
      border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;}
    .sprint-badge.risk-none   {background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;}
    .sprint-badge.risk-low    {background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;}
    .sprint-badge.risk-medium {background:#fffbeb;color:#d97706;border:1px solid #fde68a;}
    .sprint-badge.risk-high   {background:#fff7ed;color:#ea580c;border:1px solid #fed7aa;}
    .sprint-badge.risk-critical{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}

    /* Risk banner */
    .risk-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;
      border-radius:8px;margin-bottom:10px;font-size:12.5px;}
    .risk-banner.risk-medium{background:#fffbeb;color:#92400e;border:1px solid #fde68a;}
    .risk-banner.risk-high{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;}
    .risk-banner.risk-critical{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}

    .actions{display:flex;gap:8px;align-items:center;}
    .btn-ghost{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;
      border-radius:8px;border:1.5px solid #e2e8f0;background:white;color:#475569;
      font-size:12.5px;font-weight:600;cursor:pointer;}
    .btn-ghost:hover{border-color:#cbd5e1;background:#f8fafc;}
    .btn-primary{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;
      border-radius:8px;border:none;background:#4f46e5;color:white;font-size:12.5px;
      font-weight:600;cursor:pointer;box-shadow:0 1px 4px rgba(79,70,229,.35);}
    .btn-primary:hover{background:#4338ca;}

    .filter-row{display:flex;align-items:center;gap:12px;}
    .filter-chips{display:flex;gap:6px;}
    .chip{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;
      border-radius:8px;border:1.5px solid #e2e8f0;background:white;font-size:12px;
      font-weight:500;color:#475569;cursor:pointer;}
    .chip strong{font-weight:700;color:#1e293b;}
    .chip:hover{border-color:#cbd5e1;background:#f8fafc;}

    .avatar-strip{display:flex;align-items:center;margin-left:4px;}
    .avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-size:11px;font-weight:700;color:white;border:2px solid white;
      margin-left:-6px;cursor:pointer;transition:transform .12s;flex-shrink:0;}
    .avatar:first-child{margin-left:0;}
    .avatar:hover{transform:scale(1.15);z-index:10;}
    .avatar-overflow{background:#e2e8f0;color:#475569;font-size:10px;}

    .view-toggle{margin-left:auto;display:flex;background:#f1f5f9;border-radius:999px;padding:3px;gap:2px;}
    .toggle-btn{padding:4px 14px;border-radius:999px;border:none;background:none;font-size:12px;
      font-weight:500;color:#475569;cursor:pointer;}
    .toggle-btn.active{background:white;color:#4338ca;font-weight:600;
      box-shadow:0 1px 2px rgba(15,23,42,.06);}
  `]
})
export class BoardHeaderComponent {
  readonly project      = input<ProjectDto | null>(null);
  readonly members      = input<ProjectMemberDto[]>([]);
  readonly activeSprint = input<SprintSummaryDto | null>(null);
  readonly newTask      = output<void>();
  readonly newSprint    = output<void>();

  private readonly COLORS = [
    '#4f46e5','#0d9488','#ea580c','#e11d48',
    '#7c3aed','#2563eb','#16a34a','#d97706','#0891b2'
  ];
  private readonly MAX_VISIBLE = 4;

  riskClass(): string {
    return 'risk-' + (this.activeSprint()?.aiRiskLevel ?? 'none').toLowerCase();
  }

  visibleMembers() { return this.members().slice(0, this.MAX_VISIBLE); }
  overflowCount()  { return Math.max(0, this.members().length - this.MAX_VISIBLE); }

  avatarColor(employeeId: string): string {
    return this.COLORS[employeeId.charCodeAt(0) % this.COLORS.length];
  }

  initial(fullName: string): string {
    return fullName?.trim()[0]?.toUpperCase() ?? '?';
  }

  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
