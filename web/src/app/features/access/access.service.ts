import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';
import { Paged } from '../../core/models/people.models';

export interface RoleRef { id: string; name: string; }
export interface UserSummary {
  id: string; email: string; fullName: string; status: 'Invited' | 'Active' | 'Deactivated';
  roles: RoleRef[]; lastLoginAt: string | null; inviteExpiresAt: string | null; createdAt: string;
}
export interface Role { id: string; name: string; description: string | null; isSystem: boolean; isAdmin: boolean; permissions: string[]; activeUsers: number; }
export interface PermissionDef { key: string; group: string; name: string; description: string; scoped: boolean; scopes: string[]; }

/** Identity: logins and roles. Users need users.manage; changing roles needs roles.manage; reading roles is open. */
@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly api = inject(ApiService);
  private readonly base = `${environment.apiUrls.identity}/api/v1`;

  users(q: { search?: string; status?: string | null; page?: number; pageSize?: number }): Observable<Paged<UserSummary>> {
    return this.api.get<Paged<UserSummary>>(`${this.base}/users`, { search: q.search?.trim() || null, status: q.status, page: q.page ?? 1, pageSize: q.pageSize ?? 50 });
  }
  user(id: string) { return this.api.get<UserSummary>(`${this.base}/users/${id}`); }
  invite(body: { email: string; fullName: string; roleIds: string[] }) { return this.api.post<UserSummary>(`${this.base}/users/invite`, body); }
  resendInvite(id: string) { return this.api.post<boolean>(`${this.base}/users/${id}/resend-invite`, {}); }
  setRoles(id: string, roleIds: string[]) { return this.api.put<UserSummary>(`${this.base}/users/${id}/roles`, { roleIds }); }
  deactivate(id: string) { return this.api.post<boolean>(`${this.base}/users/${id}/deactivate`, {}); }
  activate(id: string) { return this.api.post<boolean>(`${this.base}/users/${id}/activate`, {}); }

  roles() { return this.api.get<Role[]>(`${this.base}/roles`); }
  catalog() { return this.api.get<PermissionDef[]>(`${this.base}/roles/permissions`); }
  createRole(body: { name: string; description: string | null; permissions: string[] }) { return this.api.post<Role>(`${this.base}/roles`, body); }
  updateRole(id: string, body: { name: string; description: string | null; permissions: string[] }) { return this.api.put<Role>(`${this.base}/roles/${id}`, body); }
  deleteRole(id: string) { return this.api.delete<boolean>(`${this.base}/roles/${id}`); }
}

/** "3 days ago", "in 5 days". */
export function relative(iso: string | null, now = Date.now()): string {
  if (!iso) return '';
  const days = Math.round((new Date(iso).getTime() - now) / 864e5);
  if (days === 0) return 'today';
  if (days === -1) return 'yesterday';
  if (days === 1) return 'tomorrow';
  return days < 0 ? `${-days} days ago` : `in ${days} days`;
}
