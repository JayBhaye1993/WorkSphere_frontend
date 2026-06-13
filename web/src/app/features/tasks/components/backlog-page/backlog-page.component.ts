import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskState } from '../../store/task.state';
import { TaskDto, TaskPriority, PRIORITY_CONFIG } from '../../models/task.models';
import { LucideInbox, LucideFilter, LucideChevronDown } from '@lucide/angular';

@Component({
  selector: 'ws-backlog-page',
  standalone: true,
  imports: [CommonModule, LucideInbox, LucideFilter, LucideChevronDown],
  template: `
    <div class="backlog-page">

      <!-- Header -->
      <div class="backlog-header">
        <div class="header-left">
          <h2 class="title">Backlog</h2>
          <span class="subtitle">{{ state.activeProject()?.name }}</span>
        </div>
        <div class="header-stats">
          @if (state.backlog().criticalCount > 0) {
            <span class="stat critical">{{ state.backlog().criticalCount }} Critical</span>
          }
          @if (state.backlog().highCount > 0) {
            <span class="stat high">{{ state.backlog().highCount }} High</span>
          }
          <span class="stat total">{{ state.backlog().totalCount }} tasks</span>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <button class="filter-chip" [class.active]="priorityFilter() === null"
          (click)="setPriorityFilter(null)">All</button>
        @for (p of priorities; track p) {
          <button class="filter-chip" [class.active]="priorityFilter() === p"
            (click)="setPriorityFilter(p)"
            [style.color]="priorityFilter() === p ? getPriority(p).text : ''">
            <span class="dot" [style.background]="getPriority(p).swatch"></span>
            {{ p }}
          </button>
        }
      </div>

      <!-- Task list -->
      <div class="backlog-body">
        @if (state.backlogLoading()) {
          <div class="empty-state">
            <div class="spinner"></div>
            <span>Loading backlog…</span>
          </div>
        } @else if (filteredTasks().length === 0) {
          <div class="empty-state">
            <svg lucideInbox [size]="40" class="empty-icon"></svg>
            <p class="empty-title">Backlog is empty</p>
            <p class="empty-sub">
              @if (priorityFilter()) {
                No {{ priorityFilter() }} priority tasks in the backlog.
              } @else {
                All tasks are either in a sprint or completed.
              }
            </p>
          </div>
        } @else {
          <div class="task-list">
            <!-- Column headers -->
            <div class="list-header">
              <span class="col-priority">Priority</span>
              <span class="col-title">Task</span>
              <span class="col-tags">Tags</span>
              <span class="col-due">Due</span>
              <span class="col-hours">Est.</span>
              <span class="col-status">Status</span>
            </div>

            @for (task of filteredTasks(); track task.id) {
              <div class="task-row" [class.overdue]="isOverdue(task)">

                <!-- Priority -->
                <span class="col-priority">
                  <span class="priority-badge"
                    [style.color]="getPriority(task.priority).text"
                    [style.background]="getPriority(task.priority).bg">
                    {{ task.priority }}
                  </span>
                </span>

                <!-- Title + description -->
                <span class="col-title">
                  <span class="task-title">{{ task.title }}</span>
                  @if (task.description) {
                    <span class="task-desc">{{ task.description | slice:0:80 }}{{ task.description.length > 80 ? '…' : '' }}</span>
                  }
                </span>

                <!-- Tags -->
                <span class="col-tags">
                  @for (tag of task.tags.slice(0, 2); track tag) {
                    <span class="tag">{{ tag }}</span>
                  }
                  @if (task.tags.length > 2) {
                    <span class="tag-more">+{{ task.tags.length - 2 }}</span>
                  }
                </span>

                <!-- Due date -->
                <span class="col-due" [class.overdue-text]="isOverdue(task)">
                  @if (task.dueDate) {
                    {{ fmtDate(task.dueDate) }}
                  } @else {
                    <span class="no-date">—</span>
                  }
                </span>

                <!-- Estimated hours -->
                <span class="col-hours">
                  @if (task.estimatedHours) {
                    {{ task.estimatedHours }}h
                  } @else {
                    <span class="no-date">—</span>
                  }
                </span>

                <!-- Status -->
                <span class="col-status">
                  <span class="status-badge status-{{ task.status.toLowerCase() }}">
                    {{ fmtStatus(task.status) }}
                  </span>
                </span>

              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .backlog-page { display:flex; flex-direction:column; height:100%; overflow:hidden; background:#f8fafc; }

    /* Header */
    .backlog-header { display:flex; align-items:center; justify-content:space-between;
      padding:16px 24px 12px; background:white; border-bottom:1px solid #e2e8f0; }
    .header-left { display:flex; align-items:baseline; gap:10px; }
    .title { font-size:18px; font-weight:700; color:#0f172a; margin:0; letter-spacing:-.02em; }
    .subtitle { font-size:13px; color:#64748b; }
    .header-stats { display:flex; align-items:center; gap:8px; }
    .stat { font-size:12px; font-weight:600; padding:3px 10px; border-radius:999px; }
    .stat.critical { background:#fef2f2; color:#dc2626; }
    .stat.high     { background:#fff7ed; color:#ea580c; }
    .stat.total    { background:#f1f5f9; color:#475569; }

    /* Filter bar */
    .filter-bar { display:flex; align-items:center; gap:6px;
      padding:10px 24px; background:white; border-bottom:1px solid #f1f5f9; }
    .filter-chip { display:inline-flex; align-items:center; gap:5px; height:28px; padding:0 12px;
      border-radius:999px; border:1.5px solid #e2e8f0; background:white; font-size:12px;
      font-weight:500; color:#475569; cursor:pointer; transition:all .12s; }
    .filter-chip:hover { border-color:#cbd5e1; background:#f8fafc; }
    .filter-chip.active { border-color:#4f46e5; background:#eef2ff; color:#4338ca; font-weight:600; }
    .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

    /* Body */
    .backlog-body { flex:1; overflow-y:auto; padding:16px 24px; }

    /* Empty state */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:12px; padding:80px 20px; color:#94a3b8; }
    .empty-icon { color:#cbd5e1; }
    .empty-title { font-size:16px; font-weight:600; color:#475569; margin:0; }
    .empty-sub { font-size:13px; color:#94a3b8; margin:0; text-align:center; }
    .spinner { width:20px; height:20px; border:2px solid #e2e8f0; border-top-color:#4f46e5;
      border-radius:50%; animation:spin .6s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg) } }

    /* Task list */
    .task-list { display:flex; flex-direction:column; gap:2px; }
    .list-header { display:grid;
      grid-template-columns: 100px 1fr 140px 90px 60px 100px;
      gap:12px; padding:8px 14px;
      font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; }

    .task-row { display:grid;
      grid-template-columns: 100px 1fr 140px 90px 60px 100px;
      gap:12px; align-items:center; padding:10px 14px;
      background:white; border-radius:8px; border:1px solid #f1f5f9;
      transition:all .12s; cursor:default; }
    .task-row:hover { border-color:#e2e8f0; box-shadow:0 1px 4px rgba(15,23,42,.06); }
    .task-row.overdue { border-left:3px solid #f87171; }

    /* Columns */
    .col-priority { display:flex; align-items:center; }
    .col-title { display:flex; flex-direction:column; gap:2px; min-width:0; }
    .col-tags { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
    .col-due { font-size:12.5px; color:#475569; white-space:nowrap; }
    .col-hours { font-size:12.5px; color:#475569; }
    .col-status { display:flex; align-items:center; }

    /* Priority badge */
    .priority-badge { font-size:11px; font-weight:600; padding:2px 8px;
      border-radius:999px; white-space:nowrap; }

    /* Task title */
    .task-title { font-size:13px; font-weight:500; color:#1e293b;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .task-desc { font-size:11.5px; color:#94a3b8;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    /* Tags */
    .tag { font-size:11px; font-weight:500; padding:2px 7px; border-radius:4px;
      background:#f1f5f9; color:#475569; white-space:nowrap; }
    .tag-more { font-size:11px; color:#94a3b8; }

    /* Status badges */
    .status-badge { font-size:11px; font-weight:600; padding:2px 8px; border-radius:999px; }
    .status-todo        { background:#f1f5f9; color:#64748b; }
    .status-inprogress  { background:#eff6ff; color:#2563eb; }
    .status-blocked     { background:#fef2f2; color:#dc2626; }
    .status-inreview    { background:#f5f3ff; color:#7c3aed; }

    .overdue-text { color:#ef4444; font-weight:600; }
    .no-date { color:#cbd5e1; }
  `]
})
export class BacklogPageComponent {
  readonly state = inject(TaskState);

  readonly priorities: TaskPriority[] = ['Critical', 'High', 'Medium', 'Low'];
  private _priorityFilter = signal<TaskPriority | null>(null);
  readonly priorityFilter = this._priorityFilter.asReadonly();

  readonly filteredTasks = computed(() => {
    const tasks = this.state.backlog().tasks;
    const filter = this._priorityFilter();
    return filter ? tasks.filter(t => t.priority === filter) : tasks;
  });

  setPriorityFilter(p: TaskPriority | null): void { this._priorityFilter.set(p); }

  getPriority(p: TaskPriority) { return PRIORITY_CONFIG[p]; }

  isOverdue(task: TaskDto): boolean {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && task.status !== 'Done';
  }

  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  fmtStatus(s: string): string {
    const map: Record<string, string> = {
      ToDo: 'To Do', InProgress: 'In Progress',
      Blocked: 'Blocked', InReview: 'In Review', Done: 'Done'
    };
    return map[s] ?? s;
  }
}
