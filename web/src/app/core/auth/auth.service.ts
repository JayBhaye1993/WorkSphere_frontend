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

  // Permissions come from the access token's "perm" claims ("employees.create", "employees.view:team"...).
  // Used only to show or hide controls; the API enforces every rule itself.
  private _perms = signal<string[]>(readPerms(localStorage.getItem(TOKEN_KEY)));
  readonly permissions = this._perms.asReadonly();

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

  /** True when the user holds the permission at any scope ("employees.view" matches "employees.view:team"). */
  can(key: string): boolean {
    return this._perms().some(p => p === key || p.startsWith(key + ':'));
  }

  /** The scope held for a scoped permission: 'all' > 'team' > 'own', or null. */
  scopeOf(key: string): 'all' | 'team' | 'own' | null {
    const scopes = this._perms().filter(p => p.startsWith(key + ':')).map(p => p.split(':')[1]);
    return (['all', 'team', 'own'] as const).find(s => scopes.includes(s)) ?? null;
  }

  private saveSession(auth: AuthToken) {
    localStorage.setItem(TOKEN_KEY,   auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(USER_KEY,    JSON.stringify(auth.user));
    this._user.set(auth.user);
    this._perms.set(readPerms(auth.accessToken));
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this._perms.set([]);
  }

  private loadUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}

/** Reads the "perm" claim(s) from a JWT without verifying it (display only). */
function readPerms(token: string | null): string[] {
  if (!token) return [];
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(part.padEnd(part.length + (4 - part.length % 4) % 4, '=')), c => c.charCodeAt(0));
    const json = JSON.parse(new TextDecoder().decode(bytes));
    const p = json.perm;
    return Array.isArray(p) ? p : p ? [p] : [];
  } catch { return []; }
}
