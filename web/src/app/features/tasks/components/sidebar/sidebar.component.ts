import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';
import {
  LucideLayers, LucideLayoutDashboard, LucideList, LucideCalendar,
  LucideClipboardCheck, LucideLayoutGrid, LucideLineChart, LucideClock, LucideUsers
} from '@lucide/angular';
import { TaskState } from '../../store/task.state';
import { ManageTeamDialogComponent } from '../manage-team-dialog/manage-team-dialog.component';
import { NewProjectDialogComponent } from '../new-project-dialog/new-project-dialog.component';

@Component({
  selector: 'ws-tasks-sidebar',
  standalone: true,
  imports: [CommonModule, NewProjectDialogComponent, ManageTeamDialogComponent, LucideLayers, LucideLayoutDashboard, LucideList, LucideCalendar,
    LucideClipboardCheck, LucideLayoutGrid, LucideLineChart, LucideClock, LucideUsers],
  template: `
    <aside class="sidebar">
      <div class="logo-row">
        <div class="logo-mark"><svg lucideLayers [size]="16" class="logo-icon"></svg></div>
        <span class="wordmark"><span class="work">Work</span><span class="sphere">Sphere</span></span>
      </div>

      <button class="tenant-btn">
        <span class="tenant-badge">N</span>
        <div class="tenant-info">
          <span class="tenant-name">Northwind</span>
          <span class="tenant-sub">Enterprise ï¿½ 248 seats</span>
        </div>
      </button>

      <nav class="nav">
        <div class="section-label">WORKSPACE</div>
        <button class="nav-item"><svg lucideLayoutDashboard [size]="17" class="nav-icon"></svg>Boards<span class="count">5</span></button>
        <button class="nav-item" [class.active]="state.activeView()==='backlog'" (click)="openBacklog()"><svg lucideList [size]="17" class="nav-icon"></svg>Backlog@if(state.backlog().totalCount>0){<span class="count">{{state.backlog().totalCount}}</span>}</button>
        <button class="nav-item" [class.active]="state.activeView()==='sprints'" (click)="openSprints()">
          <svg lucideCalendar [size]="17" class="nav-icon"></svg>Sprints
          @if (state.sprints().length > 0) {
            <span class="count">{{ state.sprints().length }}</span>
          }
        </button>

        <div class="section-label">VIEWS</div>
        <button class="nav-item" [class.active]="state.activeView()==='board'" (click)="state.setView('board')">
          <svg lucideClipboardCheck [size]="17" class="nav-icon"></svg>
          My Tasks<span class="count">{{ state.myTasks().length }}</span>
        </button>
        <button class="nav-item" [class.active]="state.activeView()==='workload'" (click)="state.setView('workload')">
          <svg lucideLayoutGrid [size]="17" class="nav-icon"></svg>Team Workload
        </button>
        <button class="nav-item"><svg lucideLineChart [size]="17" class="nav-icon"></svg>Reports</button>
        <button class="nav-item"><svg lucideClock [size]="17" class="nav-icon"></svg>Timeline</button>

        <div class="section-label projects-label">PROJECTS <button class="new-proj-btn" (click)="showNewProject=true" title="New project">+</button></div>

        @if (state.loading() && state.projects().length === 0) {
          <div class="nav-loading">Loading projectsï¿½</div>
        }

        @for (p of state.projects(); track p.id) {
          <button class="nav-item project-item"
            [class.active]="state.activeProjectId() === p.id"
            (click)="state.selectProject(p.id)">
            <span class="project-swatch" [style.background]="projectColor(p.id)"></span>
            <span class="proj-name">{{ p.name }}</span>
            @if (p.taskCount > 0) {
              <span class="count">{{ p.taskCount }}</span>
            }
            <button class="team-btn" (click)="openManageTeam(p.id, p.name, $event)" title="Manage team"><svg lucideUsers [size]="14"></svg></button>
          </button>
        }

        @if (!state.loading() && state.projects().length === 0) {
          <div class="nav-empty">No projects yet</div>
        }
      </nav>

      <div class="footer">
        <span class="footer-avatar">{{ (auth.user()?.fullName ?? "U")[0].toUpperCase() }}</span>
        <div class="capacity">
          <div class="cap-label">My capacity <strong class="mono">32 / 40h</strong></div>
          <div class="cap-track"><div class="cap-fill" style="width:80%"></div></div>
        </div>
      </div>
    <button class="logout-btn" (click)="logout()">? Sign out</button>
    <ws-manage-team-dialog
    [visible]="showManageTeam"
    [projectId]="manageTeamProjectId"
    [projectName]="manageTeamProjectName"
    (close)="showManageTeam=false" />
  <ws-new-project-dialog [visible]="showNewProject" (close)="showNewProject=false" /></aside>
  `,
  styles: [`
    .sidebar{width:248px;height:100%;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;}
    .logo-row{display:flex;align-items:center;gap:9px;padding:14px 16px 12px;border-bottom:1px solid #f1f5f9;}
    .logo-mark{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#6366f1);box-shadow:0 2px 6px rgba(79,70,229,.35);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .logo-icon{color:white;}
    .wordmark{font-size:15px;font-weight:700;letter-spacing:-.02em;}.work{color:#0f172a;}.sphere{color:#4f46e5;}
    .tenant-btn{display:flex;align-items:center;gap:8px;margin:8px 10px;padding:7px 10px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;transition:all .12s;text-align:left;}
    .tenant-btn:hover{background:white;border-color:#cbd5e1;}
    .tenant-badge{width:22px;height:22px;border-radius:6px;background:#0f766e;color:white;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .tenant-info{flex:1;}.tenant-name{display:block;font-size:12.5px;font-weight:600;color:#1e293b;line-height:1.2;}.tenant-sub{font-size:10.5px;color:#64748b;}
    .nav{flex:1;overflow-y:auto;padding:6px 10px;}
    .section-label{font-size:10.5px;font-weight:600;letter-spacing:.06em;color:#94a3b8;padding:10px 10px 6px;text-transform:uppercase;}
    .nav-item{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border-radius:8px;border:none;background:none;font-size:13px;font-weight:500;color:#475569;cursor:pointer;text-align:left;position:relative;transition:all .12s;}
    .nav-item:hover{background:#f1f5f9;color:#1e293b;}
    .nav-item.active{background:#eef2ff;color:#4338ca;font-weight:600;}
    .nav-item.active::before{content:'';position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:0 2px 2px 0;background:#4f46e5;}
    .nav-icon{color:#94a3b8;flex-shrink:0;transition:color .12s;}
    .nav-item:hover .nav-icon{color:#475569;}.nav-item.active .nav-icon{color:#4f46e5;}
    .count{margin-left:auto;font-size:11px;font-weight:600;color:#64748b;background:#f1f5f9;padding:1px 7px;border-radius:999px;min-width:22px;text-align:center;}
    .nav-item.active .count{background:white;color:#4338ca;}
    .project-swatch{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
    .nav-loading{font-size:12px;color:#94a3b8;padding:8px 10px;}
    .projects-label{display:flex;align-items:center;justify-content:space-between;padding-right:10px;}
    .new-proj-btn{width:20px;height:20px;border-radius:5px;border:none;background:#eef2ff;color:#4f46e5;font-size:16px;font-weight:700;cursor:pointer;display:grid;place-items:center;line-height:1;}
    .new-proj-btn:hover{background:#4f46e5;color:white;}
    .team-btn{background:none;border:none;cursor:pointer;font-size:13px;opacity:1;padding:2px 4px;border-radius:4px;margin-left:auto;}

    .nav-empty{font-size:12px;color:#94a3b8;padding:8px 10px;font-style:italic;}
    .footer{display:flex;align-items:center;gap:10px;padding:12px 14px;border-top:1px solid #e2e8f0;}
    .footer-avatar{width:26px;height:26px;border-radius:50%;background:#4f46e5;color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .capacity{flex:1;}.cap-label{font-size:11px;color:#475569;margin-bottom:4px;}.cap-label strong{font-size:11px;color:#334155;}
    .cap-track{height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden;}.cap-fill{height:100%;background:#6366f1;border-radius:999px;}
    .logout-btn{display:flex;align-items:center;gap:7px;width:100%;padding:7px 10px;border-radius:8px;border:none;background:none;font-size:12.5px;font-weight:500;color:#94a3b8;cursor:pointer;margin-top:6px;}
    .logout-btn:hover{background:#fee2e2;color:#dc2626;}
  `]
})
export class SidebarComponent {
  readonly state = inject(TaskState);
  showNewProject = false;
  showManageTeam = false;
  manageTeamProjectId = '';
  manageTeamProjectName = '';
  readonly auth = inject(AuthService);
  private readonly colors = ['#4f46e5','#0d9488','#ea580c','#e11d48','#7c3aed','#2563eb','#16a34a'];

  openManageTeam(id: string, name: string, e: Event): void {
    e.stopPropagation();
    this.manageTeamProjectId = id;
    this.manageTeamProjectName = name;
    this.showManageTeam = true;
  }

  openBacklog(): void {
    this.state.setView('backlog');
    this.state.loadBacklog();
  }

  openSprints(): void {
    this.state.setView('sprints');
    this.state.loadSprints();
  }

  logout(): void { this.auth.logout(); }
  projectColor(id: string): string { return this.colors[id.charCodeAt(0) % this.colors.length]; }
}
