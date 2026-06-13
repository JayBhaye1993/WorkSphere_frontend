import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  ProjectDto, TaskDto, ProjectMemberDto, BacklogDto, SprintSummaryDto,
  CreateProjectRequest, CreateTaskRequest, UpdateTaskStatusRequest, CreateSprintRequest
} from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.task;

  // â”€â”€ Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getProjects(): Observable<ProjectDto[]> {
    return this.http
      .get<ApiResponse<ProjectDto[]>>(`${this.base}/api/v1/projects`)
      .pipe(map(r => r.data ?? []));
  }

  createProject(req: CreateProjectRequest): Observable<ProjectDto> {
    return this.http
      .post<ApiResponse<ProjectDto>>(`${this.base}/api/v1/projects`, req)
      .pipe(map(r => r.data!));
  }

  getProjectMembers(projectId: string): Observable<ProjectMemberDto[]> {
    return this.http
      .get<ApiResponse<ProjectMemberDto[]>>(`${this.base}/api/v1/projects/${projectId}/members`)
      .pipe(map(r => r.data ?? []));
  }

  // â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getProjectTasks(projectId: string): Observable<TaskDto[]> {
    return this.http
      .get<ApiResponse<TaskDto[]>>(`${this.base}/api/v1/projects/${projectId}/tasks`)
      .pipe(map(r => r.data ?? []));
  }

  getMyTasks(): Observable<TaskDto[]> {
    return this.http
      .get<ApiResponse<TaskDto[]>>(`${this.base}/api/v1/tasks/my`)
      .pipe(map(r => r.data ?? []));
  }

  createTask(req: CreateTaskRequest): Observable<TaskDto> {
    return this.http
      .post<ApiResponse<TaskDto>>(`${this.base}/api/v1/tasks`, req)
      .pipe(map(r => r.data!));
  }

  updateTaskStatus(req: UpdateTaskStatusRequest): Observable<TaskDto> {
    return this.http
      .patch<ApiResponse<TaskDto>>(`${this.base}/api/v1/tasks/${req.taskId}/status`, req)
      .pipe(map(r => r.data!));
  }

  // â”€â”€ Backlog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getBacklog(projectId: string): Observable<BacklogDto> {
    return this.http
      .get<ApiResponse<BacklogDto>>(`${this.base}/api/v1/sprints/backlog?projectId=${projectId}`)
      .pipe(map(r => r.data ?? { tasks: [], totalCount: 0, criticalCount: 0, highCount: 0 }));
  }

  // â”€â”€ Sprints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getSprints(projectId: string): Observable<SprintSummaryDto[]> {
    return this.http
      .get<ApiResponse<SprintSummaryDto[]>>(`${this.base}/api/v1/sprints?projectId=${projectId}`)
      .pipe(map(r => r.data ?? []));
  }

  getActiveSprint(projectId: string): Observable<SprintSummaryDto | null> {
    return this.http
      .get<ApiResponse<SprintSummaryDto | null>>(`${this.base}/api/v1/sprints/active?projectId=${projectId}`)
      .pipe(map(r => r.data ?? null));
  }

  createSprint(req: CreateSprintRequest): Observable<SprintSummaryDto> {
    return this.http
      .post<ApiResponse<SprintSummaryDto>>(`${this.base}/api/v1/sprints`, req)
      .pipe(map(r => r.data!));
  }

  startSprint(sprintId: string): Observable<SprintSummaryDto> {
    return this.http
      .post<ApiResponse<SprintSummaryDto>>(`${this.base}/api/v1/sprints/${sprintId}/start`, {})
      .pipe(map(r => r.data!));
  }

  completeSprint(sprintId: string): Observable<SprintSummaryDto> {
    return this.http
      .post<ApiResponse<SprintSummaryDto>>(`${this.base}/api/v1/sprints/${sprintId}/complete`, {})
      .pipe(map(r => r.data!));
  }

  addTaskToSprint(sprintId: string, taskId: string): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean>>(`${this.base}/api/v1/sprints/${sprintId}/tasks`, { taskId })
      .pipe(map(r => r.data ?? false));
  }
}
