import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthToken, LoginRequest, RegisterRequest, UserProfile } from '../models/auth.model';
const TOKEN_KEY   = 'ws_access_token';
const REFRESH_KEY = 'ws_refresh_token';
const USER_KEY    = 'ws_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrls.identity;

  // Signals — reactive state
  private _user = signal<UserProfile | null>(this.loadUser());
  readonly user     = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly tenantId   = computed(() => this._user()?.tenantId ?? '');
  readonly roles      = computed(() => this._user()?.roles ?? []);

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest) {
    return this.http
      .post<ApiResponse<AuthToken>>(`${this.base}/api/v1/auth/login`, req)
      .pipe(tap(res => { if (res.success && res.data) this.saveSession(res.data); }));
  }

  register(req: RegisterRequest) {
    return this.http
      .post<ApiResponse<AuthToken>>(`${this.base}/api/v1/auth/register`, req)
      .pipe(tap(res => { if (res.success && res.data) this.saveSession(res.data); }));
  }

  refreshToken() {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return throwError(() => new Error('No refresh token'));
    return this.http
      .post<ApiResponse<AuthToken>>(`${this.base}/api/v1/auth/refresh`, { refreshToken: rt })
      .pipe(tap(res => { if (res.success && res.data) this.saveSession(res.data); }));
  }

  logout() {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (rt) {
      this.http
        .post(`${this.base}/api/v1/auth/revoke`, { refreshToken: rt })
        .subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  private saveSession(auth: AuthToken) {
    localStorage.setItem(TOKEN_KEY,   auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(USER_KEY,    JSON.stringify(auth.user));
    this._user.set(auth.user);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  private loadUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
