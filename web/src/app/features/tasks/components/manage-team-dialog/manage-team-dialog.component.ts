import { Component, input, output, inject, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideUserMinus, LucideUserPlus, LucideCrown } from '@lucide/angular';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { EmployeeService, EmployeeDto } from '../../../../core/services/employee.service';

interface ProjectMember {
  employeeId: string;
  role: string;
  fullName: string;
  email: string;
  designation?: string;
}

@Component({
  selector: 'ws-manage-team-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, LucideUserMinus, LucideUserPlus, LucideCrown],
  template: `
    @if (visible()) {
      <div class="backdrop" (click)="close.emit()"></div>
      <div class="panel" role="dialog">
        <div class="panel-header">
          <h3>Manage Team: {{ projectName() }}</h3>
          <button class="close-btn" (click)="close.emit()">
            <svg lucideX [size]="18"></svg>
          </button>
        </div>
        <div class="panel-body">

          <!-- Current members -->
          <div class="section-label">Current Members ({{ members.length }})</div>
          @if (members.length === 0) {
            <p class="empty">No members yet.</p>
          }
          @for (m of members; track m.employeeId) {
            <div class="member-row">
              <span class="av">{{ (m.fullName || 'U')[0].toUpperCase() }}</span>
              <span class="info">
                <span class="name">{{ m.fullName || m.employeeId }}</span>
                <span class="role-badge" [class]="'role-' + m.role.toLowerCase()">{{ m.role }}</span>
              </span>
              @if (m.role === 'Owner') {
                <span class="crown-badge" title="Project Owner">
                  <svg lucideCrown [size]="15"></svg>
                </span>
              } @else {
                <button class="remove-btn" (click)="removeMember(m.employeeId)" title="Remove">
                  <svg lucideUserMinus [size]="15"></svg>
                </button>
              }
            </div>
          }

          <!-- Add member -->
          <div class="section-label" style="margin-top:20px">Add Member</div>
          <div class="search-wrap">
            <input [(ngModel)]="searchInput" (ngModelChange)="onSearch()"
              placeholder="Search by name or email..." autocomplete="off" />
            @if (showDropdown) {
              <div class="emp-dropdown">
                @for (emp of searchResults; track emp.id) {
                  <div class="emp-option" (click)="addMember(emp)">
                    <span class="emp-av">{{ emp.fullName[0] }}</span>
                    <span class="emp-info">
                      <span class="emp-name">{{ emp.fullName }}</span>
                      <span class="emp-role">{{ emp.designation ?? emp.email }}</span>
                    </span>
                    <svg lucideUserPlus [size]="15" style="color:#6366f1;margin-left:auto"></svg>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);z-index:40;backdrop-filter:blur(2px)}
    .panel{position:fixed;top:0;right:0;height:100%;width:420px;background:white;z-index:50;
      display:flex;flex-direction:column;box-shadow:-8px 0 32px rgba(15,23,42,.14);animation:slideIn .18s ease}
    @keyframes slideIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
    .panel-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;
      border-bottom:1px solid #e2e8f0;}
    .panel-header h3{font-size:15px;font-weight:700;color:#0f172a;margin:0}
    .close-btn{width:32px;height:32px;border-radius:8px;border:none;background:none;
      display:grid;place-items:center;color:#64748b;cursor:pointer;}
    .close-btn:hover{background:#f1f5f9}
    .panel-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:10px}
    .section-label{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase}
    .empty{font-size:13px;color:#94a3b8;margin:0}
    .member-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:#f8fafc;}
    .av{width:36px;height:36px;border-radius:50%;background:#e0e7ff;color:#4338ca;font-size:14px;
      font-weight:700;display:grid;place-items:center;flex-shrink:0;}
    .info{display:flex;flex-direction:column;gap:3px;flex:1;}
    .name{font-size:13px;font-weight:600;color:#1e293b;}
    .role-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;width:fit-content;}
    .role-owner{background:#fef3c7;color:#92400e;}
    .role-member{background:#e0f2fe;color:#0369a1;}
    .role-viewer{background:#f1f5f9;color:#64748b;}
    .crown-badge{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;
      color:#d97706;flex-shrink:0;}
    .remove-btn{width:30px;height:30px;border-radius:8px;border:none;background:none;
      display:grid;place-items:center;color:#ef4444;cursor:pointer;flex-shrink:0;}
    .remove-btn:hover{background:#fee2e2;}
    .search-wrap{position:relative;}
    .search-wrap input{width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:9px 12px;
      font-size:13px;font-family:inherit;color:#1e293b;outline:none;box-sizing:border-box;}
    .search-wrap input:focus{border-color:#4f46e5;}
    .emp-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:white;
      border:1.5px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.12);
      z-index:100;max-height:200px;overflow-y:auto;}
    .emp-option{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;}
    .emp-option:hover{background:#f8fafc;}
    .emp-av{width:30px;height:30px;border-radius:50%;background:#e0e7ff;color:#4338ca;
      font-size:12px;font-weight:700;display:grid;place-items:center;flex-shrink:0;}
    .emp-info{display:flex;flex-direction:column;}
    .emp-name{font-size:13px;font-weight:600;color:#1e293b;}
    .emp-role{font-size:11.5px;color:#94a3b8;}
  `]
})
export class ManageTeamDialogComponent implements OnInit, OnChanges, OnDestroy {
  readonly visible     = input(false);
  readonly projectId   = input('');
  readonly projectName = input('');
  readonly close       = output<void>();

  members: ProjectMember[] = [];
  searchInput = '';
  searchResults: EmployeeDto[] = [];
  showDropdown = false;

  private readonly http    = inject(HttpClient);
  private readonly empSvc  = inject(EmployeeService);
  private readonly taskApi = environment.apiUrls.task;
  private searchSubject    = new Subject<string>();
  private destroy$         = new Subject<void>();

  ngOnInit(): void {
    // Wire up search once — not on every ngOnChanges
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => this.empSvc.search(q)),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      const existingIds = this.members.map(m => m.employeeId);
      this.searchResults = results.filter(r => !existingIds.includes(r.id));
      this.showDropdown = this.searchResults.length > 0;
    });
  }

  ngOnChanges(): void {
    if (this.visible() && this.projectId()) {
      this.loadMembers();
    }
    if (!this.visible()) {
      this.searchInput = '';
      this.searchResults = [];
      this.showDropdown = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMembers(): void {
    this.http.get<any>(`${this.taskApi}/api/v1/projects/${this.projectId()}/members`)
      .subscribe(r => {
        // Backend now returns fullName, email, designation directly from employee_cache
        this.members = r.data ?? [];
      });
  }

  onSearch(): void {
    const q = this.searchInput.trim();
    if (q.length >= 1) this.searchSubject.next(q);
    else { this.searchResults = []; this.showDropdown = false; }
  }

  addMember(emp: EmployeeDto): void {
    this.http.post<any>(
      `${this.taskApi}/api/v1/projects/${this.projectId()}/members`,
      { employeeId: emp.id, role: 'Member' }
    ).subscribe(() => {
      this.searchInput = '';
      this.searchResults = [];
      this.showDropdown = false;
      this.loadMembers();
    });
  }

  removeMember(employeeId: string): void {
    this.http.delete<any>(
      `${this.taskApi}/api/v1/projects/${this.projectId()}/members/${employeeId}`
    ).subscribe(() => this.loadMembers());
  }
}



