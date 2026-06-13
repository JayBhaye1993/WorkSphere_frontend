import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

import {
  ProjectDto, TaskDto, ProjectMemberDto, BacklogDto,
  CreateProjectRequest, CreateTaskRequest, UpdateTaskStatusRequest
} from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrls.task;

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

  getBacklog(projectId: string): Observable<BacklogDto> {
    return this.http
      .get<ApiResponse<BacklogDto>>(`${this.base}/api/v1/sprints/backlog?projectId=${projectId}`)
      .pipe(map(r => r.data ?? { tasks: [], totalCount: 0, criticalCount: 0, highCount: 0 }));
  }

  updateTaskStatus(req: UpdateTaskStatusRequest): Observable<TaskDto> {
    return this.http
      .patch<ApiResponse<TaskDto>>(`${this.base}/api/v1/tasks/${req.taskId}/status`, req)
      .pipe(map(r => r.data!));
  }
}

