import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';

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
      { path: 'people/new', canActivate: [permissionGuard('employees.create')], loadComponent: () => import('./features/people/person-form/person-form.page').then(m => m.PersonFormPage) },
      { path: 'people/:id', loadComponent: () => import('./features/people/person/person.page').then(m => m.PersonPage) },
      { path: 'people/:id/edit', canActivate: [permissionGuard('employees.edit')], loadComponent: () => import('./features/people/person-form/person-form.page').then(m => m.PersonFormPage) },
      {
        path: 'time-off',
        loadComponent: () => import('./features/soon/soon.page').then(m => m.SoonPage),
        data: { title: 'Time off', body: 'Leave requests, balances and holidays for your location will show here. They are built in the HR round.' },
      },
      { path: 'more', loadComponent: () => import('./features/more/more.page').then(m => m.MorePage) },
      { path: 'more/profile', loadComponent: () => import('./features/people/my-profile/my-profile.page').then(m => m.MyProfilePage) },
      {
        path: 'more/settings',
        canActivate: [permissionGuard(['org.manage', 'users.manage', 'roles.manage'])],
        children: [
          { path: '', loadComponent: () => import('./features/settings/settings-hub.page').then(m => m.SettingsHubPage) },
          { path: 'users', canActivate: [permissionGuard('users.manage')], loadComponent: () => import('./features/access/users.page').then(m => m.UsersPage) },
          { path: 'users/:id', canActivate: [permissionGuard('users.manage')], loadComponent: () => import('./features/access/user.page').then(m => m.UserPage) },
          { path: 'roles', loadComponent: () => import('./features/access/roles.page').then(m => m.RolesPage) },
          { path: 'roles/new', canActivate: [permissionGuard('roles.manage')], loadComponent: () => import('./features/access/role-edit.page').then(m => m.RoleEditPage) },
          { path: 'roles/:id', loadComponent: () => import('./features/access/role-edit.page').then(m => m.RoleEditPage) },
          { path: 'custom-fields', canActivate: [permissionGuard('org.manage')], loadComponent: () => import('./features/settings/custom-fields.page').then(m => m.CustomFieldsPage) },
          { path: 'custom-fields/new', canActivate: [permissionGuard('org.manage')], loadComponent: () => import('./features/settings/custom-field-edit.page').then(m => m.CustomFieldEditPage) },
          { path: 'custom-fields/:id', canActivate: [permissionGuard('org.manage')], loadComponent: () => import('./features/settings/custom-field-edit.page').then(m => m.CustomFieldEditPage) },
          { path: 'employee-code', canActivate: [permissionGuard('org.manage')], loadComponent: () => import('./features/settings/employee-code.page').then(m => m.EmployeeCodePage) },
          { path: ':kind', canActivate: [permissionGuard('org.manage')], loadComponent: () => import('./features/settings/org-list.page').then(m => m.OrgListPage) },
        ],
      },
      // Old links from the first prototype.
      { path: 'dashboard', redirectTo: 'people', pathMatch: 'prefix' },
    ],
  },
  { path: '**', redirectTo: 'tasks' },
];
