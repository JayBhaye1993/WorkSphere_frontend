import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    // Everything after sign-in lives inside the app shell (bottom bar on phones, left rail on desktop).
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'tasks', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/soon/soon.page').then(m => m.SoonPage),
        data: { title: 'Home', body: 'Your day across tasks, time off and your team will show here. It is built in the HR round.' },
      },
      { path: 'tasks', loadChildren: () => import('./features/tasks/tasks.routes').then(m => m.TASK_ROUTES) },
      { path: 'people', loadComponent: () => import('./features/people/directory/directory.page').then(m => m.DirectoryPage) },
      { path: 'people/:id', loadComponent: () => import('./features/people/person/person.page').then(m => m.PersonPage) },
      {
        path: 'time-off',
        loadComponent: () => import('./features/soon/soon.page').then(m => m.SoonPage),
        data: { title: 'Time off', body: 'Leave requests, balances and holidays for your location will show here. They are built in the HR round.' },
      },
      { path: 'more', loadComponent: () => import('./features/more/more.page').then(m => m.MorePage) },
      // Old links from the first prototype.
      { path: 'dashboard', redirectTo: 'people', pathMatch: 'prefix' },
    ],
  },
  { path: '**', redirectTo: 'tasks' },
];
