import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  ProjectDto, TaskDto, TaskDetailDto, ProjectMemberDto, BacklogDto, SprintSummaryDto,
  CreateProjectRequest, CreateTaskRequest, UpdateTaskStatusRequest, CreateSprintRequest
} from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.task;

  getProjects(): Observable<ProjectDto[]> {
    return this.http.get<ApiResponse<ProjectDto[]>>(`${this.base}/api/v1/projects`).pipe(map(r => r.data ?? []));
  }
  getProjectMembers(projectId: string): Observable<ProjectMemberDto[]> {
    return this.http.get<ApiResponse<ProjectMemberDto[]>>(`${this.base}/api/v1/projects/${projectId}/members`).pipe(map(r => r.data ?? []));
  }
  createProject(req: CreateProjectRequest): Observable<ProjectDto> {
    return this.http.post<ApiResponse<ProjectDto>>(`${this.base}/api/v1/projects`, req).pipe(map(r => r.data!));
  }
  getProjectTasks(projectId: string): Observable<TaskDto[]> {
    return this.http.get<ApiResponse<TaskDto[]>>(`${this.base}/api/v1/projects/${projectId}/tasks`).pipe(map(r => r.data ?? []));
  }
  createTask(req: CreateTaskRequest): Observable<TaskDto> {
    return this.http.post<ApiResponse<TaskDto>>(`${this.base}/api/v1/tasks`, req).pipe(map(r => r.data!));
  }
  updateTaskStatus(taskId: string, newStatus: string, newPosition: number): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/api/v1/tasks/${taskId}/status`, { newStatus, newPosition }).pipe(map(r => r.data));
  }
  getBacklog(projectId: string): Observable<BacklogDto> {
    return this.http.get<ApiResponse<BacklogDto>>(`${this.base}/api/v1/sprints/backlog?projectId=${projectId}`).pipe(map(r => r.data ?? { tasks: [], totalCount: 0, criticalCount: 0, highCount: 0 }));
  }
  getSprints(projectId: string): Observable<SprintSummaryDto[]> {
    return this.http.get<ApiResponse<SprintSummaryDto[]>>(`${this.base}/api/v1/sprints?projectId=${projectId}`).pipe(map(r => r.data ?? []));
  }
  getActiveSprint(projectId: string): Observable<SprintSummaryDto | null> {
    return this.http.get<ApiResponse<SprintSummaryDto | null>>(`${this.base}/api/v1/sprints/active?projectId=${projectId}`).pipe(map(r => r.data ?? null));
  }
  createSprint(req: CreateSprintRequest): Observable<SprintSummaryDto> {
    return this.http.post<ApiResponse<SprintSummaryDto>>(`${this.base}/api/v1/sprints`, req).pipe(map(r => r.data!));
  }
  startSprint(sprintId: string): Observable<SprintSummaryDto> {
    return this.http.post<ApiResponse<SprintSummaryDto>>(`${this.base}/api/v1/sprints/${sprintId}/start`, {}).pipe(map(r => r.data!));
  }
  completeSprint(sprintId: string): Observable<SprintSummaryDto> {
    return this.http.post<ApiResponse<SprintSummaryDto>>(`${this.base}/api/v1/sprints/${sprintId}/complete`, {}).pipe(map(r => r.data!));
  }
  addTaskToSprint(sprintId: string, taskId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.base}/api/v1/sprints/${sprintId}/tasks`, { taskId }).pipe(map(r => r.data ?? false));
  }
  getTaskById(taskId: string): Observable<TaskDetailDto> {
    return this.http.get<ApiResponse<TaskDetailDto>>(`${this.base}/api/v1/tasks/${taskId}`).pipe(map(r => r.data!));
  }
  addComment(taskId: string, body: string): Observable<any> {
    return this.http.post<any>(`${this.base}/api/v1/tasks/${taskId}/comments`, { body }).pipe(map(r => r.data));
  }
  updateTask(taskId: string, req: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.base}/api/v1/tasks/${taskId}`, req).pipe(map(r => r.data));
  }
  getSubtasks(taskId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/api/v1/tasks/${taskId}/subtasks`).pipe(map(r => r.data ?? []));
  }
  createSubtask(taskId: string, req: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/api/v1/tasks/${taskId}/subtasks`, req).pipe(map(r => r.data));
  }
  toggleSubtask(taskId: string, subtaskId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/api/v1/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {}).pipe(map(r => r.data));
  }
  deleteSubtask(taskId: string, subtaskId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/api/v1/tasks/${taskId}/subtasks/${subtaskId}`).pipe(map(r => r.data));
  }
  deleteComment(taskId: string, commentId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/api/v1/tasks/${taskId}/comments/${commentId}`).pipe(map(r => r.data));
  }
  logTime(taskId: string, req: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.base}/api/v1/tasks/${taskId}/timelogs`, req).pipe(map(r => r.data));
  }
  getActivity(taskId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/api/v1/tasks/${taskId}/activity`).pipe(map(r => r.data ?? []));
  }
  getMyTasks(): Observable<TaskDto[]> {
    return this.http.get<ApiResponse<TaskDto[]>>(`${this.base}/api/v1/tasks/my`).pipe(map(r => r.data ?? []));
  }
}

