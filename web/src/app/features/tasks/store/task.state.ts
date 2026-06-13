import { Injectable, computed, signal, inject } from '@angular/core';
import { TaskService } from '../services/task.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  TaskDto, ProjectDto, ProjectMemberDto, BacklogDto, KanbanColumn, KANBAN_COLUMNS,
  TaskStatus, CreateTaskRequest, CreateProjectRequest
} from '../models/task.models';

export type ActiveView = 'board' | 'workload' | 'backlog';

@Injectable({ providedIn: 'root' })
export class TaskState {
  private readonly svc   = inject(TaskService);
  private readonly toast = inject(ToastService);

  private _projects        = signal<ProjectDto[]>([]);
  private _tasks           = signal<TaskDto[]>([]);
  private _activeProjectId = signal<string | null>(null);
  private _activeView      = signal<ActiveView>('board');
  private _loading         = signal(false);
  private _error           = signal<string | null>(null);
  private _dropTarget      = signal<TaskStatus | null>(null);
  private _members         = signal<ProjectMemberDto[]>([]);
  private _backlog         = signal<BacklogDto>({ tasks: [], totalCount: 0, criticalCount: 0, highCount: 0 });
  private _backlogLoading  = signal(false);

  readonly projects        = this._projects.asReadonly();
  readonly tasks           = this._tasks.asReadonly();
  readonly activeProjectId = this._activeProjectId.asReadonly();
  readonly activeView      = this._activeView.asReadonly();
  readonly loading         = this._loading.asReadonly();
  readonly error           = this._error.asReadonly();
  readonly dropTarget      = this._dropTarget.asReadonly();
  readonly members         = this._members.asReadonly();
  readonly backlog         = this._backlog.asReadonly();
  readonly backlogLoading  = this._backlogLoading.asReadonly();

  readonly activeProject = computed(() =>
    this._projects().find(p => p.id === this._activeProjectId()) ?? null
  );

  readonly kanbanColumns = computed<KanbanColumn[]>(() =>
    KANBAN_COLUMNS.map(col => ({
      ...col,
      tasks: this._tasks()
        .filter(t => t.status === col.status)
        .sort((a, b) => {
          const order = { Critical:0, High:1, Medium:2, Low:3 };
          return order[a.priority] - order[b.priority];
        })
    }))
  );

  readonly myTasks = computed(() =>
    this._tasks().filter(t => t.status !== 'Done')
  );

  setView(view: ActiveView): void { this._activeView.set(view); }
  setDropTarget(s: TaskStatus | null): void { this._dropTarget.set(s); }

  loadProjects(): void {
    this._loading.set(true);
    this._error.set(null);
    this.svc.getProjects().subscribe({
      next: projects => {
        this._projects.set(projects);
        if (projects.length > 0 && !this._activeProjectId()) {
          this.selectProject(projects[0].id);
        } else {
          this._loading.set(false);
        }
      },
      error: err => {
        this._error.set('Failed to load projects: ' + err.message);
        this._loading.set(false);
      }
    });
  }

  selectProject(id: string): void {
    this._activeProjectId.set(id);
    this._loading.set(true);
    this._tasks.set([]);
    this._members.set([]);

    this.svc.getProjectTasks(id).subscribe({
      next: tasks => {
        this._tasks.set(tasks);
        this._loading.set(false);
      },
      error: err => {
        this._error.set('Failed to load tasks: ' + err.message);
        this._loading.set(false);
      }
    });

    this.svc.getProjectMembers(id).subscribe({
      next: members => this._members.set(members),
      error: ()      => this._members.set([])
    });
  }

  loadMyTasks(): void {
    this._loading.set(true);
    this.svc.getMyTasks().subscribe({
      next: tasks => { this._tasks.set(tasks); this._loading.set(false); },
      error: err  => { this._error.set(err.message); this._loading.set(false); }
    });
  }

  loadBacklog(): void {
    const id = this._activeProjectId();
    if (!id) return;
    this._backlogLoading.set(true);
    this.svc.getBacklog(id).subscribe({
      next: backlog => {
        this._backlog.set(backlog);
        this._backlogLoading.set(false);
      },
      error: () => {
        this._backlog.set({ tasks: [], totalCount: 0, criticalCount: 0, highCount: 0 });
        this._backlogLoading.set(false);
      }
    });
  }

  createProject(req: CreateProjectRequest): void {
    this.svc.createProject(req).subscribe({
      next: project => {
        this._projects.update(l => [...l, project]);
        this.selectProject(project.id);
        this.toast.show(`Project "${project.name}" created`);
      },
      error: err => this._error.set(err.message)
    });
  }

  createTask(req: CreateTaskRequest): void {
    this.svc.createTask(req).subscribe({
      next: task => {
        this._tasks.update(l => [...l, task]);
        this.toast.show('Task created');
      },
      error: err => {
        this._error.set(err.message);
        this.toast.show('Failed to create task', 'error');
      }
    });
  }

  moveTask(taskId: string, newStatus: TaskStatus): void {
    const task = this._tasks().find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const oldStatus = task.status;
    const col = KANBAN_COLUMNS.find(c => c.status === newStatus)!;

    this._tasks.update(l => l.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, dueState: newStatus === 'Done' ? '' : t.dueState }
        : t
    ));
    this.toast.show(`Moved to ${col.label}`);

    this.svc.updateTaskStatus({ taskId, newStatus, newPosition: 1000 }).subscribe({
      next: updated => this._tasks.update(l =>
        l.map(t => t.id === updated.id ? { ...updated } : t)
      ),
      error: () => {
        this._tasks.update(l => l.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
        this.toast.show('Failed to move task', 'error');
      }
    });
  }

  applyAiSuggestion(taskId: string): void {
    const task = this._tasks().find(t => t.id === taskId);
    if (!task?.aiSuggestedPriority) return;
    const newPri = task.aiSuggestedPriority;
    this._tasks.update(l => l.map(t =>
      t.id === taskId ? { ...t, priority: newPri, aiSuggestedPriority: null, aiFlag: false } : t
    ));
    this.toast.show(`AI suggestion applied → ${newPri}`);
  }

  dismissAiSuggestion(taskId: string): void {
    this._tasks.update(l => l.map(t =>
      t.id === taskId ? { ...t, aiSuggestedPriority: null, aiFlag: false } : t
    ));
    this.toast.show('Suggestion dismissed', 'info');
  }
}