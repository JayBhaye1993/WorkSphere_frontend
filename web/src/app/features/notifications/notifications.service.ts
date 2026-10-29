import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';

export interface InboxItem {
  id: string; category: 'TimeOff' | 'People' | 'Tasks' | 'Account'; kind: string; title: string; body: string | null;
  link: string | null; actorName: string | null; createdAt: string; read: boolean;
}
export interface Inbox { items: InboxItem[]; total: number; unread: number; page: number; pageSize: number; }
export interface NotificationPreference { category: string; label: string; hint: string; email: 'All' | 'Important' | 'None'; }

/**
 * Your notifications. The unread count is shared app-wide (bell, rail, More tab) and refreshed every
 * 30 seconds while the app is visible, and straight away when you come back to it.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);
  private readonly base = `${environment.apiUrls.notification}/api/v1/notifications`;
  readonly unread = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => { if (document.visibilityState === 'visible') void this.refresh(); }, 30_000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void this.refresh(); });
  }

  async refresh() {
    try { this.unread.set(await firstValueFrom(this.api.get<number>(`${this.base}/unread-count`))); } catch { /* offline or signed out: keep the last count */ }
  }

  inbox(q: { unreadOnly?: boolean; category?: string | null; page?: number; pageSize?: number }): Observable<Inbox> {
    return this.api.get<Inbox>(this.base, { unreadOnly: q.unreadOnly || null, category: q.category ?? null, page: q.page ?? 1, pageSize: q.pageSize ?? 30 })
      .pipe(tap(x => this.unread.set(x.unread)));
  }
  markRead(id: string): Observable<number> { return this.api.post<number>(`${this.base}/${id}/read`, {}).pipe(tap(n => this.unread.set(n))); }
  markAllRead(): Observable<number> { return this.api.post<number>(`${this.base}/read-all`, {}).pipe(tap(n => this.unread.set(n))); }
  preferences(): Observable<NotificationPreference[]> { return this.api.get(`${this.base}/preferences`); }
  savePreferences(email: Record<string, string>): Observable<NotificationPreference[]> { return this.api.put(`${this.base}/preferences`, { email }); }
}
