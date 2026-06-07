const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, typeof content === 'string' ? content.trimStart() : content, 'utf8');
  console.log('Created: ' + filePath);
}

// ─────────────────────────────────────────────────────────────────
// ANGULAR WEB FOUNDATION
// C:\Projects\WorkSphere_frontend\web
// ─────────────────────────────────────────────────────────────────
const WEB = 'C:\\Projects\\WorkSphere_frontend\\web';

// Environment files
write(`${WEB}\\src\\environments\\environment.ts`, `
export const environment = {
  production: false,
  apiUrls: {
    identity: 'http://localhost:52092',
    tenant:   'http://localhost:52094',
    employee: 'http://localhost:52096',
    hr:       'http://localhost:52098',
    task:     'http://localhost:52100',
    notification: 'http://localhost:52102',
    document: 'http://localhost:52104',
    workflow: 'http://localhost:52106',
    ai:       'http://localhost:52108',
    analytics:'http://localhost:52110',
  }
};
`);

write(`${WEB}\\src\\environments\\environment.prod.ts`, `
export const environment = {
  production: true,
  apiUrls: {
    identity: 'https://api.worksphere.in/identity',
    tenant:   'https://api.worksphere.in/tenant',
    employee: 'https://api.worksphere.in/employee',
    hr:       'https://api.worksphere.in/hr',
    task:     'https://api.worksphere.in/task',
    notification: 'https://api.worksphere.in/notification',
    document: 'https://api.worksphere.in/document',
    workflow: 'https://api.worksphere.in/workflow',
    ai:       'https://api.worksphere.in/ai',
    analytics:'https://api.worksphere.in/analytics',
  }
};
`);

// Core models
write(`${WEB}\\src\\app\\core\\models\\api-response.model.ts`, `
export interface ApiResponse<T> {
  success:   boolean;
  data:      T | null;
  error:     string | null;
  timestamp: string;
}

export interface PagedResult<T> {
  items:      T[];
  totalCount: number;
  page:       number;
  pageSize:   number;
}
`);

write(`${WEB}\\src\\app\\core\\models\\auth.model.ts`, `
export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest {
  fullName:    string;
  companyName: string;
  email:       string;
  password:    string;
}

export interface AuthToken {
  accessToken:       string;
  refreshToken:      string;
  accessTokenExpiry: string;
  user:              UserProfile;
}

export interface UserProfile {
  id:              string;
  tenantId:        string;
  email:           string;
  fullName:        string;
  roles:           string[];
  isActive:        boolean;
  isEmailVerified: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
`);

// Auth Service
write(`${WEB}\\src\\app\\core\\auth\\auth.service.ts`, `
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthToken, LoginRequest, RegisterRequest, UserProfile } from '../models/auth.model';

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
      .post<ApiResponse<AuthToken>>(\`\${this.base}/api/v1/auth/login\`, req)
      .pipe(tap(res => { if (res.success && res.data) this.saveSession(res.data); }));
  }

  register(req: RegisterRequest) {
    return this.http
      .post<ApiResponse<AuthToken>>(\`\${this.base}/api/v1/auth/register\`, req)
      .pipe(tap(res => { if (res.success && res.data) this.saveSession(res.data); }));
  }

  refreshToken() {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return throwError(() => new Error('No refresh token'));
    return this.http
      .post<ApiResponse<AuthToken>>(\`\${this.base}/api/v1/auth/refresh\`, { refreshToken: rt })
      .pipe(tap(res => { if (res.success && res.data) this.saveSession(res.data); }));
  }

  logout() {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (rt) {
      this.http
        .post(\`\${this.base}/api/v1/auth/revoke\`, { refreshToken: rt })
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
`);

// Auth Guard
write(`${WEB}\\src\\app\\core\\auth\\auth.guard.ts`, `
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/auth/login']);
  return false;
};
`);

// Token Interceptor
write(`${WEB}\\src\\app\\core\\auth\\token.interceptor.ts`, `
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getAccessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            const newToken = auth.getAccessToken();
            const retryReq = newToken
              ? req.clone({ setHeaders: { Authorization: \`Bearer \${newToken}\` } })
              : req;
            return next(retryReq);
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
`);

// API Service base
write(`${WEB}\\src\\app\\core\\api\\api.service.ts`, `
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, PagedResult } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(url: string, params?: Record<string, unknown>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined)
          httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http
      .get<ApiResponse<T>>(url, { params: httpParams })
      .pipe(map(r => r.data as T));
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(url, body)
      .pipe(map(r => r.data as T));
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(url, body)
      .pipe(map(r => r.data as T));
  }

  delete<T>(url: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(url)
      .pipe(map(r => r.data as T));
  }
}
`);

// App Routes
write(`${WEB}\\src\\app\\app.routes.ts`, `
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'employees',
        loadChildren: () =>
          import('./features/employees/employees.routes').then(m => m.EMPLOYEE_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
`);

// App Config
write(`${WEB}\\src\\app\\app.config.ts`, `
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/auth/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor])),
  ],
};
`);

// Auth Routes placeholder
write(`${WEB}\\src\\app\\features\\auth\\auth.routes.ts`, `
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.component').then(m => m.RegisterComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
`);

// Login placeholder
write(`${WEB}\\src\\app\\features\\auth\\login\\login.component.ts`, `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;">
      <div style="background:white;padding:40px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);text-align:center;">
        <h1 style="color:#1A56B0;font-family:Inter,Arial,sans-serif;">WorkSphere</h1>
        <p style="color:#64748B;font-family:Arial,sans-serif;">Login component — coming soon</p>
      </div>
    </div>
  \`,
})
export class LoginComponent {}
`);

// Register placeholder
write(`${WEB}\\src\\app\\features\\auth\\register\\register.component.ts`, `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: \`<div style="padding:40px;text-align:center;font-family:Arial,sans-serif;">
    <h2 style="color:#1A56B0;">Register — coming soon</h2></div>\`,
})
export class RegisterComponent {}
`);

// Shell placeholder
write(`${WEB}\\src\\app\\layout\\shell\\shell.component.ts`, `
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: \`
    <div style="display:flex;min-height:100vh;font-family:Inter,Arial,sans-serif;">
      <aside style="width:240px;background:#1E3A5F;color:white;padding:24px 0;">
        <div style="padding:0 24px 24px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <h2 style="margin:0;font-size:20px;color:#60A5FA;">WorkSphere</h2>
        </div>
        <nav style="padding:16px 0;">
          <a href="/dashboard" style="display:block;padding:12px 24px;color:rgba(255,255,255,0.8);text-decoration:none;">Dashboard</a>
          <a href="/dashboard/employees" style="display:block;padding:12px 24px;color:rgba(255,255,255,0.8);text-decoration:none;">Employees</a>
        </nav>
      </aside>
      <main style="flex:1;background:#f8fafc;padding:32px;">
        <router-outlet />
      </main>
    </div>
  \`,
})
export class ShellComponent {}
`);

// Dashboard placeholder
write(`${WEB}\\src\\app\\features\\dashboard\\dashboard.component.ts`, `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div>
      <h1 style="color:#1E3A5F;font-size:28px;margin:0 0 8px;">Dashboard</h1>
      <p style="color:#64748B;margin:0 0 32px;">Welcome back, {{ auth.user()?.fullName }}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        <div style="background:white;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <p style="margin:0;color:#64748B;font-size:14px;">Total Employees</p>
          <p style="margin:8px 0 0;color:#1E3A5F;font-size:32px;font-weight:700;">—</p>
        </div>
        <div style="background:white;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <p style="margin:0;color:#64748B;font-size:14px;">Open Tasks</p>
          <p style="margin:8px 0 0;color:#1E3A5F;font-size:32px;font-weight:700;">—</p>
        </div>
        <div style="background:white;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <p style="margin:0;color:#64748B;font-size:14px;">Pending Leaves</p>
          <p style="margin:8px 0 0;color:#1E3A5F;font-size:32px;font-weight:700;">—</p>
        </div>
      </div>
    </div>
  \`,
})
export class DashboardComponent {
  constructor(public auth: AuthService) {}
}
`);

// Employees routes placeholder
write(`${WEB}\\src\\app\\features\\employees\\employees.routes.ts`, `
import { Routes } from '@angular/router';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/employee-list.component').then(m => m.EmployeeListComponent),
  },
];
`);

write(`${WEB}\\src\\app\\features\\employees\\list\\employee-list.component.ts`, `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: \`<div><h2 style="color:#1E3A5F;">Employees — coming soon</h2></div>\`,
})
export class EmployeeListComponent {}
`);

// Global styles
write(`${WEB}\\src\\styles.scss`, `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

// WorkSphere Design Tokens
:root {
  --ws-primary:       #1A56B0;
  --ws-primary-dark:  #1E3A5F;
  --ws-primary-light: #DBEAFE;
  --ws-success:       #166534;
  --ws-warning:       #B45309;
  --ws-danger:        #991B1B;
  --ws-bg:            #F8FAFC;
  --ws-surface:       #FFFFFF;
  --ws-border:        #E2E8F0;
  --ws-text:          #0F172A;
  --ws-muted:         #64748B;
  --ws-radius-sm:     4px;
  --ws-radius:        8px;
  --ws-radius-lg:     12px;
  --ws-radius-xl:     16px;
  --ws-shadow-sm:     0 1px 3px rgba(0,0,0,0.08);
  --ws-shadow:        0 4px 16px rgba(0,0,0,0.10);
  --ws-shadow-lg:     0 8px 32px rgba(0,0,0,0.12);
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin:      0;
  padding:     0;
  font-family: 'Inter', Arial, sans-serif;
  font-size:   14px;
  color:       var(--ws-text);
  background:  var(--ws-bg);
  -webkit-font-smoothing: antialiased;
}

a { color: var(--ws-primary); text-decoration: none; }
a:hover { text-decoration: underline; }

// Utility classes
.ws-card {
  background: var(--ws-surface);
  border-radius: var(--ws-radius);
  box-shadow: var(--ws-shadow-sm);
  padding: 24px;
}

.ws-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--ws-radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;

  &--primary {
    background: var(--ws-primary);
    color: white;
    &:hover { background: var(--ws-primary-dark); }
  }

  &--outline {
    background: transparent;
    color: var(--ws-primary);
    border: 1.5px solid var(--ws-primary);
    &:hover { background: var(--ws-primary-light); }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.ws-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--ws-border);
  border-radius: var(--ws-radius);
  font-size: 14px;
  font-family: inherit;
  color: var(--ws-text);
  background: var(--ws-surface);
  transition: border-color 0.2s;
  outline: none;

  &:focus { border-color: var(--ws-primary); }
  &::placeholder { color: var(--ws-muted); }
  &.error { border-color: var(--ws-danger); }
}

.ws-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ws-text);
  margin-bottom: 6px;
}

.ws-error {
  font-size: 12px;
  color: var(--ws-danger);
  margin-top: 4px;
}
`);

// App component
write(`${WEB}\\src\\app\\app.component.ts`, `
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: []
})
export class AppComponent {}
`);

// ─────────────────────────────────────────────────────────────────
// ELECTRON DESKTOP FOUNDATION
// C:\Projects\WorkSphere_frontend\desktop
// ─────────────────────────────────────────────────────────────────
const DESK = 'C:\\Projects\\WorkSphere_frontend\\desktop';

write(`${DESK}\\package.json`, JSON.stringify({
  name: "worksphere-desktop",
  version: "1.0.0",
  description: "WorkSphere Desktop App — Electron 31",
  main: "src/main.js",
  scripts: {
    "dev": "concurrently \"npm run angular\" \"wait-on http://localhost:4200 && electron .\"",
    "angular": "cd ../web && ng serve",
    "start": "electron .",
    "build": "electron-builder",
    "build:web": "cd ../web && ng build --configuration production"
  },
  build: {
    appId: "in.worksphere.desktop",
    productName: "WorkSphere",
    directories: { output: "dist" },
    win: { target: "nsis", icon: "assets/icon.ico" },
    mac: { target: "dmg", icon: "assets/icon.icns" },
    linux: { target: "AppImage" },
    files: ["src/**/*", "assets/**/*", "!node_modules"]
  },
  devDependencies: {}
}, null, 2));

write(`${DESK}\\src\\main.js`, `
const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        1024,
    minHeight:       600,
    frame:           true,
    backgroundColor: '#F8FAFC',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'WorkSphere',
    show: false,
  });

  // Load Angular dev server in dev, built files in prod
  const url = isDev
    ? 'http://localhost:4200'
    : \`file://\${path.join(__dirname, '..', 'www', 'index.html')}\`;

  mainWindow.loadURL(url);

  // Show window once ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  // Create a simple tray icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('WorkSphere');
  const menu = Menu.buildFromTemplate([
    { label: 'Open WorkSphere', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => mainWindow?.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for future use
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-version',  () => app.getVersion());
`);

write(`${DESK}\\src\\preload.js`, `
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to Angular renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getVersion:  () => ipcRenderer.invoke('get-version'),

  // OS-level notifications (future use)
  showNotification: (title, body) => {
    new Notification(title, { body });
  },

  // Check if running in Electron
  isElectron: true,
});
`);

// Assets placeholder
write(`${DESK}\\assets\\.gitkeep`, '');

// ─────────────────────────────────────────────────────────────────
// REACT NATIVE MOBILE FOUNDATION
// C:\Projects\WorkSphere_frontend\mobile
// ─────────────────────────────────────────────────────────────────
const MOB = 'C:\\Projects\\WorkSphere_frontend\\mobile';

// Install script for mobile dependencies
write(`${MOB}\\install-deps.bat`, `
@echo off
echo Installing WorkSphere Mobile dependencies...
cd /d %~dp0
call npm install @react-navigation/native@6 @react-navigation/stack@6 @react-navigation/bottom-tabs@6
call npm install react-native-screens react-native-safe-area-context
call npm install react-native-gesture-handler react-native-reanimated
call npm install react-native-mmkv
call npm install axios
echo Done!
pause
`);

// Design tokens
write(`${MOB}\\src\\theme\\tokens.ts`, `
export const Colors = {
  primary:      '#1A56B0',
  primaryDark:  '#1E3A5F',
  primaryLight: '#DBEAFE',
  success:      '#166534',
  warning:      '#B45309',
  danger:       '#991B1B',
  bg:           '#F8FAFC',
  surface:      '#FFFFFF',
  border:       '#E2E8F0',
  text:         '#0F172A',
  muted:        '#64748B',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
};
`);

// Storage service (MMKV)
write(`${MOB}\\src\\services\\storage.service.ts`, `
// MMKV-based storage — faster than AsyncStorage, synchronous reads
// Install: npm install react-native-mmkv

let storage: any = null;

function getStorage() {
  if (!storage) {
    const { MMKV } = require('react-native-mmkv');
    storage = new MMKV({ id: 'worksphere-storage' });
  }
  return storage;
}

export const StorageService = {
  set(key: string, value: string): void {
    getStorage().set(key, value);
  },
  get(key: string): string | undefined {
    return getStorage().getString(key);
  },
  delete(key: string): void {
    getStorage().delete(key);
  },
  contains(key: string): boolean {
    return getStorage().contains(key);
  },
};

export const StorageKeys = {
  ACCESS_TOKEN:  'ws_access_token',
  REFRESH_TOKEN: 'ws_refresh_token',
  USER:          'ws_user',
};
`);

// API Client
write(`${MOB}\\src\\services\\api.service.ts`, `
import axios, { AxiosInstance, AxiosError } from 'axios';
import { StorageService, StorageKeys } from './storage.service';

const API_URLS = {
  identity: 'http://10.0.2.2:52092', // 10.0.2.2 = localhost from Android emulator
  tenant:   'http://10.0.2.2:52094',
  employee: 'http://10.0.2.2:52096',
  hr:       'http://10.0.2.2:52098',
  task:     'http://10.0.2.2:52100',
};

export type ServiceName = keyof typeof API_URLS;

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL, timeout: 15000 });

  // Attach JWT token
  client.interceptors.request.use(config => {
    const token = StorageService.get(StorageKeys.ACCESS_TOKEN);
    if (token) config.headers.Authorization = \`Bearer \${token}\`;
    return config;
  });

  // Handle 401 — attempt refresh
  client.interceptors.response.use(
    res => res,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        const rt = StorageService.get(StorageKeys.REFRESH_TOKEN);
        if (rt) {
          try {
            const res = await axios.post(
              \`\${API_URLS.identity}/api/v1/auth/refresh\`,
              { refreshToken: rt }
            );
            const newToken = res.data?.data?.accessToken;
            if (newToken) {
              StorageService.set(StorageKeys.ACCESS_TOKEN, newToken);
              if (error.config) {
                error.config.headers.Authorization = \`Bearer \${newToken}\`;
                return client.request(error.config);
              }
            }
          } catch {
            // Refresh failed — clear session
            StorageService.delete(StorageKeys.ACCESS_TOKEN);
            StorageService.delete(StorageKeys.REFRESH_TOKEN);
            StorageService.delete(StorageKeys.USER);
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const ApiClients = {
  identity: createClient(API_URLS.identity),
  tenant:   createClient(API_URLS.tenant),
  employee: createClient(API_URLS.employee),
  hr:       createClient(API_URLS.hr),
  task:     createClient(API_URLS.task),
};
`);

// Auth Service (mobile)
write(`${MOB}\\src\\services\\auth.service.ts`, `
import { ApiClients } from './api.service';
import { StorageService, StorageKeys } from './storage.service';

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  fullName: string; companyName: string;
  email: string; password: string;
}
export interface UserProfile {
  id: string; tenantId: string; email: string;
  fullName: string; roles: string[];
}

export const AuthService = {
  async login(req: LoginRequest) {
    const res = await ApiClients.identity.post('/api/v1/auth/login', req);
    if (res.data?.success && res.data?.data) {
      const { accessToken, refreshToken, user } = res.data.data;
      StorageService.set(StorageKeys.ACCESS_TOKEN,  accessToken);
      StorageService.set(StorageKeys.REFRESH_TOKEN, refreshToken);
      StorageService.set(StorageKeys.USER, JSON.stringify(user));
      return user as UserProfile;
    }
    throw new Error(res.data?.error || 'Login failed');
  },

  async register(req: RegisterRequest) {
    const res = await ApiClients.identity.post('/api/v1/auth/register', req);
    if (res.data?.success && res.data?.data) {
      const { accessToken, refreshToken, user } = res.data.data;
      StorageService.set(StorageKeys.ACCESS_TOKEN,  accessToken);
      StorageService.set(StorageKeys.REFRESH_TOKEN, refreshToken);
      StorageService.set(StorageKeys.USER, JSON.stringify(user));
      return user as UserProfile;
    }
    throw new Error(res.data?.error || 'Registration failed');
  },

  logout() {
    const rt = StorageService.get(StorageKeys.REFRESH_TOKEN);
    if (rt) {
      ApiClients.identity.post('/api/v1/auth/revoke', { refreshToken: rt })
        .catch(() => {});
    }
    StorageService.delete(StorageKeys.ACCESS_TOKEN);
    StorageService.delete(StorageKeys.REFRESH_TOKEN);
    StorageService.delete(StorageKeys.USER);
  },

  getCurrentUser(): UserProfile | null {
    const raw = StorageService.get(StorageKeys.USER);
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn(): boolean {
    return StorageService.contains(StorageKeys.ACCESS_TOKEN);
  },
};
`);

// Navigation placeholder
write(`${MOB}\\src\\navigation\\AppNavigator.tsx`, `
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/tokens';

// Navigation will be set up after installing:
// npm install @react-navigation/native @react-navigation/stack
// react-native-screens react-native-safe-area-context

// Placeholder — replace with full navigator after deps installed
export const AppNavigator = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WorkSphere</Text>
      <Text style={styles.subtitle}>Mobile App Foundation Ready</Text>
      <Text style={styles.note}>Run install-deps.bat then implement navigation</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.muted,
    marginBottom: 16,
  },
  note: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
`);

// Update App.tsx
write(`${MOB}\\App.tsx`, `
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
`);

console.log(`
✅ Frontend Foundation Complete!

Three projects scaffolded:

1. ANGULAR WEB — C:\\Projects\\WorkSphere_frontend\\web
   Core: AuthService, AuthGuard, TokenInterceptor, ApiService
   Features: auth routes, dashboard shell, employee routes (stubs)
   Styles: Design tokens in styles.scss, Inter font
   Run: cd web && ng serve

2. ELECTRON DESKTOP — C:\\Projects\\WorkSphere_frontend\\desktop
   main.js: BrowserWindow, Tray, IPC handlers
   preload.js: contextBridge exposes electronAPI to Angular
   In dev: loads Angular from http://localhost:4200
   Run: cd desktop && npm run dev

3. REACT NATIVE MOBILE — C:\\Projects\\WorkSphere_frontend\\mobile
   Services: AuthService, ApiService (Axios), StorageService (MMKV)
   Theme: Colors, Spacing, Radius, Typography, Shadow tokens
   Navigation: AppNavigator placeholder
   Setup: run install-deps.bat first

Next step: Build the Login component across all three surfaces.
`);
