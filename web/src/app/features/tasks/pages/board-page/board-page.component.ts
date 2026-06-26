import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskState } from '../../store/task.state';
import { KanbanColumnComponent } from '../../components/kanban-column/kanban-column.component';
import { BoardHeaderComponent } from '../../components/board-header/board-header.component';
import { NewTaskDialogComponent } from '../../components/new-task-dialog/new-task-dialog.component';
import { BacklogPageComponent } from '../../components/backlog-page/backlog-page.component';
import { SprintsPageComponent } from '../../components/sprints-page/sprints-page.component';
import { CreateSprintDialogComponent } from '../../components/create-sprint-dialog/create-sprint-dialog.component';
import { TaskDetailPanelComponent } from '../../components/task-detail-panel/task-detail-panel.component';
import { TaskDto } from '../../models/task.models';

@Component({
  selector: 'ws-board-page',
  standalone: true,
  imports: [
    CommonModule,
    KanbanColumnComponent,
    BoardHeaderComponent,
    NewTaskDialogComponent,
    BacklogPageComponent,
    SprintsPageComponent,
    CreateSprintDialogComponent,
    TaskDetailPanelComponent
  ],
  template: `
    <div class="page">
      <ws-board-header
        [project]="state.activeProject()"
        [members]="state.members()"
        [activeSprint]="state.activeSprint()"
        (newTask)="showTaskDialog.set(true)"
        (newSprint)="showSprintDialog.set(true)" />

      @if (state.activeView() === 'backlog') {
        <ws-backlog-page />
      } @else if (state.activeView() === 'sprints') {
        <ws-sprints-page />
      } @else if (state.loading()) {
        <div class="loading">
          <div class="spinner"></div>
          <span>Loading…</span>
        </div>
      } @else if (state.error()) {
        <div class="error">⚠ {{ state.error() }}</div>
      } @else {
        <div class="board-scroll">
          <div class="board">
            @for (col of state.kanbanColumns(); track col.status) {
              <ws-kanban-column
                [col]="col"
                (cardClick)="openTask($event)"
                (addTask)="showTaskDialog.set(true)" />
            }
          </div>
        </div>
      }

      <ws-new-task-dialog
        [visible]="showTaskDialog()"
        [projectId]="state.activeProjectId() ?? ''"
        (close)="showTaskDialog.set(false)" />

      <ws-create-sprint-dialog
        [visible]="showSprintDialog()"
        [projectId]="state.activeProjectId() ?? ''"
        (close)="showSprintDialog.set(false)" />

      <ws-task-detail-panel
        [taskId]="selectedTaskId()"
        (close)="selectedTaskId.set(null)" />
    </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;height:100%;overflow:hidden;}
    .loading{display:flex;align-items:center;justify-content:center;gap:12px;flex:1;color:#64748b;}
    .spinner{width:20px;height:20px;border:2px solid #e2e8f0;border-top-color:#4f46e5;border-radius:50%;animation:spin .6s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{padding:12px 16px;margin:16px 22px;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:14px;}
    .board-scroll{flex:1;overflow:auto;padding:16px 22px 22px;}
    .board{display:flex;gap:14px;align-items:flex-start;}
  `]
})
export class BoardPageComponent implements OnInit {
  readonly state            = inject(TaskState);
  readonly showTaskDialog   = signal(false);
  readonly showSprintDialog = signal(false);
  readonly selectedTaskId   = signal<string | null>(null);

  ngOnInit(): void { this.state.loadProjects(); }

  openTask(task: TaskDto): void {
    this.selectedTaskId.set(task.id);
  }
}
