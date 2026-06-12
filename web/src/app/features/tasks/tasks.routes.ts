import { Routes } from '@angular/router';

export const TASK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./tasks-shell.component').then(m => m.TasksShellComponent),
  },
];
