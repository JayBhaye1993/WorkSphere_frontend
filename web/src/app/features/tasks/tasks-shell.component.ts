import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TaskState } from './store/task.state';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { BoardPageComponent } from './pages/board-page/board-page.component';
import { WorkloadPageComponent } from './pages/workload-page/workload-page.component';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'ws-tasks-shell',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    BoardPageComponent,
    WorkloadPageComponent,
    ToastComponent,
  ],
  template: `
    <div class="shell">
      <ws-tasks-sidebar />
      <main class="main">
        @if (state.activeView() === 'workload') {
          <ws-workload-page />
        } @else {
          <ws-board-page />
        }
      </main>
    </div>
    <ws-toast />
  `,
  styles: [`
    .shell { display:grid; grid-template-columns:248px 1fr; height:100vh; overflow:hidden; }
    .main  { overflow:hidden; display:flex; flex-direction:column; background:#f1f5f9; }
  `]
})
export class TasksShellComponent {
  readonly state = inject(TaskState);
}
