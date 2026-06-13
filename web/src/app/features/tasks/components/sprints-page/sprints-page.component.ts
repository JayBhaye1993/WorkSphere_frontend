import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskState } from '../../store/task.state';
import { SprintSummaryDto } from '../../models/task.models';
import { LucideZap, LucidePlay, LucideCheckCircle, LucideClock, LucidePlus, LucideAlertTriangle } from '@lucide/angular';

@Component({
  selector: 'ws-sprints-page',
  standalone: true,
  imports: [CommonModule, LucideZap, LucidePlay, LucideCheckCircle, LucideClock, LucidePlus, LucideAlertTriangle],
  template: `
    <div class="sprints-page">

      <!-- Header -->
      <div class="sprints-header">
        <div class="header-left">
          <h2 class="title">Sprints</h2>
          <span class="subtitle">{{ state.activeProject()?.name }}</span>
        </div>
        <div class="header-right">
          <span class="sprint-count">{{ state.sprints().length }} sprint{{ state.sprints().length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Sprint list -->
      <div class="sprints-body">

        @if (state.sprints().length === 0) {
          <div class="empty-state">
            <svg lucideZap [size]="40" class="empty-icon"></svg>
            <p class="empty-title">No sprints yet</p>
            <p class="empty-sub">Click "+ New Sprint" in the board header to create your first sprint.</p>
          </div>
        }

        @for (sprint of state.sprints(); track sprint.id) {
          <div class="sprint-card" [class]="'status-' + sprint.status.toLowerCase()">

            <!-- Sprint card header -->
            <div class="card-header">
              <div class="card-left">
                <span class="status-dot" [class]="'dot-' + sprint.status.toLowerCase()"></span>
                <div class="card-title-block">
                  <span class="card-name">{{ sprint.name }}</span>
                  <span class="card-dates">{{ fmtDate(sprint.endDate) }} · {{ daysLabel(sprint) }}</span>
                </div>
              </div>
              <div class="card-right">
                <!-- AI Risk badge -->
                @if (sprint.aiRiskLevel !== 'None' && sprint.status === 'Active') {
                  <span class="risk-badge risk-{{ sprint.aiRiskLevel.toLowerCase() }}">
                    <svg lucideAlertTriangle [size]="11"></svg>
                    {{ sprint.aiRiskLevel }} Risk
                  </span>
                }
                <!-- Status badge -->
                <span class="sprint-status" [class]="'ss-' + sprint.status.toLowerCase()">
                  {{ sprint.status }}
                </span>
                <!-- Actions -->
                @if (sprint.status === 'Planning') {
                  <button class="btn-action btn-start"
                    [disabled]="starting()"
                    (click)="startSprint(sprint)">
                    <svg lucidePlay [size]="13"></svg>
                    Start Sprint
                  </button>
                }
                @if (sprint.status === 'Active') {
                  <button class="btn-action btn-complete"
                    [disabled]="completing()"
                    (click)="completeSprint(sprint)">
                    <svg lucideCheckCircle [size]="13"></svg>
                    Complete
                  </button>
                }
              </div>
            </div>

            <!-- Progress bar (only for active/completed) -->
            @if (sprint.status === 'Active' || sprint.status === 'Completed') {
              <div class="progress-wrap">
                <div class="progress-bar">
                  <div class="progress-fill"
                    [style.width.%]="sprint.completionPercentage"
                    [class]="'fill-' + sprint.status.toLowerCase()">
                  </div>
                </div>
                <span class="progress-label">{{ sprint.completionPercentage | number:'1.0-0' }}% complete</span>
              </div>
            }

            <!-- Confirm complete overlay -->
            @if (confirmingId() === sprint.id) {
              <div class="confirm-bar">
                <svg lucideAlertTriangle [size]="14" class="confirm-icon"></svg>
                <span>Incomplete tasks will return to Backlog. Confirm complete?</span>
                <button class="btn-confirm-yes" (click)="confirmComplete(sprint.id)">Yes, complete</button>
                <button class="btn-confirm-no" (click)="confirmingId.set(null)">Cancel</button>
              </div>
            }

          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .sprints-page { display:flex; flex-direction:column; height:100%; overflow:hidden; background:#f8fafc; }

    /* Header */
    .sprints-header { display:flex; align-items:center; justify-content:space-between;
      padding:16px 24px 12px; background:white; border-bottom:1px solid #e2e8f0; }
    .header-left { display:flex; align-items:baseline; gap:10px; }
    .title { font-size:18px; font-weight:700; color:#0f172a; margin:0; letter-spacing:-.02em; }
    .subtitle { font-size:13px; color:#64748b; }
    .sprint-count { font-size:12px; font-weight:600; color:#64748b;
      background:#f1f5f9; padding:3px 10px; border-radius:999px; }

    /* Body */
    .sprints-body { flex:1; overflow-y:auto; padding:16px 24px; display:flex; flex-direction:column; gap:12px; }

    /* Empty state */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:12px; padding:80px 20px; }
    .empty-icon { color:#cbd5e1; }
    .empty-title { font-size:16px; font-weight:600; color:#475569; margin:0; }
    .empty-sub { font-size:13px; color:#94a3b8; margin:0; text-align:center; }

    /* Sprint card */
    .sprint-card { background:white; border-radius:12px; border:1px solid #e2e8f0;
      padding:16px 20px; display:flex; flex-direction:column; gap:12px;
      transition:box-shadow .12s; }
    .sprint-card:hover { box-shadow:0 2px 8px rgba(15,23,42,.08); }
    .sprint-card.status-active { border-left:4px solid #4f46e5; }
    .sprint-card.status-completed { border-left:4px solid #16a34a; opacity:.8; }
    .sprint-card.status-cancelled { border-left:4px solid #94a3b8; opacity:.6; }

    /* Card header */
    .card-header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .card-left { display:flex; align-items:center; gap:12px; flex:1; min-width:0; }
    .status-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .dot-planning  { background:#94a3b8; }
    .dot-active    { background:#4f46e5; }
    .dot-completed { background:#16a34a; }
    .dot-cancelled { background:#94a3b8; }

    .card-title-block { display:flex; flex-direction:column; gap:2px; min-width:0; }
    .card-name { font-size:14px; font-weight:600; color:#0f172a;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .card-dates { font-size:12px; color:#64748b; }

    .card-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

    /* Risk badge */
    .risk-badge { display:inline-flex; align-items:center; gap:4px;
      font-size:11px; font-weight:600; padding:2px 8px; border-radius:999px; }
    .risk-badge.risk-low      { background:#f0fdf4; color:#16a34a; }
    .risk-badge.risk-medium   { background:#fffbeb; color:#d97706; }
    .risk-badge.risk-high     { background:#fff7ed; color:#ea580c; }
    .risk-badge.risk-critical { background:#fef2f2; color:#dc2626; }

    /* Sprint status badge */
    .sprint-status { font-size:11px; font-weight:600; padding:3px 10px; border-radius:999px; }
    .ss-planning  { background:#f1f5f9; color:#475569; }
    .ss-active    { background:#eef2ff; color:#4338ca; }
    .ss-completed { background:#f0fdf4; color:#15803d; }
    .ss-cancelled { background:#f1f5f9; color:#94a3b8; }

    /* Action buttons */
    .btn-action { display:inline-flex; align-items:center; gap:5px;
      height:30px; padding:0 12px; border-radius:8px;
      font-size:12px; font-weight:600; cursor:pointer; border:none;
      transition:all .12s; }
    .btn-action:disabled { opacity:.5; cursor:not-allowed; }
    .btn-start    { background:#4f46e5; color:white; }
    .btn-start:hover:not(:disabled) { background:#4338ca; }
    .btn-complete { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }
    .btn-complete:hover:not(:disabled) { background:#dcfce7; }

    /* Progress */
    .progress-wrap { display:flex; align-items:center; gap:10px; }
    .progress-bar { flex:1; height:6px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
    .progress-fill { height:100%; border-radius:999px; transition:width .3s; }
    .fill-active    { background:#4f46e5; }
    .fill-completed { background:#16a34a; }
    .progress-label { font-size:11.5px; color:#64748b; white-space:nowrap; min-width:70px; }

    /* Confirm bar */
    .confirm-bar { display:flex; align-items:center; gap:10px;
      padding:10px 14px; background:#fffbeb; border-radius:8px;
      border:1px solid #fde68a; font-size:12.5px; color:#92400e; }
    .confirm-icon { color:#d97706; flex-shrink:0; }
    .btn-confirm-yes { margin-left:auto; height:28px; padding:0 12px; border-radius:6px;
      border:none; background:#dc2626; color:white; font-size:12px; font-weight:600; cursor:pointer; }
    .btn-confirm-yes:hover { background:#b91c1c; }
    .btn-confirm-no { height:28px; padding:0 12px; border-radius:6px;
      border:1.5px solid #e2e8f0; background:white; color:#475569;
      font-size:12px; font-weight:600; cursor:pointer; }
  `]
})
export class SprintsPageComponent {
  readonly state       = inject(TaskState);
  readonly starting    = signal(false);
  readonly completing  = signal(false);
  readonly confirmingId = signal<string | null>(null);

  startSprint(sprint: SprintSummaryDto): void {
    if (sprint.status !== 'Planning') return;
    this.starting.set(true);
    this.state.startSprint(sprint.id);
    // Reset after brief delay
    setTimeout(() => this.starting.set(false), 1000);
  }

  completeSprint(sprint: SprintSummaryDto): void {
    // Show confirmation bar first
    this.confirmingId.set(sprint.id);
  }

  confirmComplete(sprintId: string): void {
    this.completing.set(true);
    this.confirmingId.set(null);
    this.state.completeSprint(sprintId);
    setTimeout(() => this.completing.set(false), 1000);
  }

  daysLabel(sprint: SprintSummaryDto): string {
    if (sprint.status === 'Completed') return 'Completed';
    if (sprint.status === 'Cancelled') return 'Cancelled';
    if (sprint.status === 'Planning')  return 'Not started';
    if (sprint.daysRemaining === 0)    return 'Due today';
    if (sprint.daysRemaining < 0)     return `${Math.abs(sprint.daysRemaining)} days overdue`;
    return `${sprint.daysRemaining} days left`;
  }

  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
