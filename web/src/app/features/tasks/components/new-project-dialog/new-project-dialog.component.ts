import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { TaskState } from '../../store/task.state';
import { EmployeeService, EmployeeDto } from '../../../../core/services/employee.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { CreateProjectRequest } from '../../models/task.models';

@Component({
  selector: 'ws-new-project-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, AsyncPipe],
  template: `
    @if (visible()) {
      <div class="backdrop" (click)="close.emit()"></div>
      <div class="panel" role="dialog">
        <div class="panel-header">
          <h3>New Project</h3>
          <button class="close-btn" (click)="close.emit()"><svg lucideX [size]="18"></svg></button>
        </div>
        <div class="panel-body">

          <div class="field">
            <label>Project name <span class="req">*</span></label>
            <input [(ngModel)]="name" placeholder="e.g. Product Launch Q3" maxlength="200" />
          </div>

          <div class="field">
            <label>Description</label>
            <textarea [(ngModel)]="description" placeholder="What is this project about?" rows="3"></textarea>
          </div>

          <div class="field">
            <label>Template <span class="hint">(optional)</span></label>
            <select [(ngModel)]="template">
              <option value="">No template — blank project</option>
              <option value="product-launch">Product Launch</option>
              <option value="office-relocation">Office Relocation</option>
              <option value="annual-audit">Annual Audit</option>
              <option value="recruitment-drive">Recruitment Drive</option>
            </select>
          </div>

          <div class="row">
            <div class="field">
              <label>Start date</label>
              <input type="date" [(ngModel)]="startDate" />
            </div>
            <div class="field">
              <label>Target end date</label>
              <input type="date" [(ngModel)]="targetEndDate" />
            </div>
          </div>

          <div class="field">
            <label>Budget <span class="hint">(optional)</span></label>
            <input type="number" [(ngModel)]="budget" placeholder="0.00" min="0" />
          </div>

          <div class="field">
            <label>Team members <span class="hint">(optional — add by User ID)</span></label>
            <div class="search-wrap">
              <input [(ngModel)]="memberInput" (ngModelChange)="onSearchInput()"
                placeholder="Search by name or email..." autocomplete="off" />
              @if (showDropdown) {
                <div class="emp-dropdown">
                  @for (emp of searchResults; track emp.id) {
                    <div class="emp-option" (click)="selectMember(emp)">
                      <span class="emp-avatar">{{ emp.fullName[0] }}</span>
                      <span class="emp-info">
                        <span class="emp-name">{{ emp.fullName }}</span>
                        <span class="emp-role">{{ emp.designation ?? emp.email }}</span>
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
            @if (selectedMembers.length > 0) {
              <div class="member-chips">
                @for (m of selectedMembers; track m.id) {
                  <span class="chip">
                    <span class="chip-av">{{ m.fullName[0] }}</span>
                    {{ m.fullName }}
                    <button (click)="removeMember(m.id)">×</button>
                  </span>
                }
              </div>
            }
          </div>

        </div>
        <div class="panel-footer">
          <button class="btn-cancel" (click)="close.emit()">Cancel</button>
          <button class="btn-create" [disabled]="!name.trim()" (click)="submit()">
            Create project
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);z-index:40;backdrop-filter:blur(2px)}
    .panel{position:fixed;top:0;right:0;height:100%;width:460px;background:white;z-index:50;
      display:flex;flex-direction:column;box-shadow:-8px 0 32px rgba(15,23,42,.14);animation:slideIn .18s ease}
    @keyframes slideIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
    .panel-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;
      border-bottom:1px solid #e2e8f0;}
    .panel-header h3{font-size:15px;font-weight:700;color:#0f172a;margin:0}
    .close-btn{width:32px;height:32px;border-radius:8px;border:none;background:none;
      display:grid;place-items:center;color:#64748b;cursor:pointer;}
    .close-btn:hover{background:#f1f5f9}
    .panel-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:16px}
    .field{display:flex;flex-direction:column;gap:6px}
    .field label{font-size:12.5px;font-weight:600;color:#374151}
    .field input,.field textarea,.field select{
      border:1.5px solid #e2e8f0;border-radius:8px;padding:9px 12px;font-size:13px;
      font-family:inherit;color:#1e293b;background:white;outline:none;transition:border-color .12s}
    .field input:focus,.field textarea:focus,.field select:focus{border-color:#4f46e5}
    .field textarea{resize:vertical;min-height:72px}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .req{color:#dc2626}
    .hint{font-weight:400;color:#94a3b8;font-size:11.5px}
    .panel-footer{padding:16px 22px;border-top:1px solid #e2e8f0;display:flex;gap:10px;justify-content:flex-end}
    .btn-cancel{height:36px;padding:0 16px;border-radius:8px;border:1.5px solid #e2e8f0;
      background:white;font-size:13px;font-weight:600;color:#475569;cursor:pointer}
    .btn-cancel:hover{background:#f8fafc}
    .btn-create{height:36px;padding:0 18px;border-radius:8px;border:none;
      background:#4f46e5;color:white;font-size:13px;font-weight:600;cursor:pointer;
      box-shadow:0 1px 4px rgba(79,70,229,.35)}
    .btn-create:hover{background:#4338ca}
    .btn-create:disabled{opacity:.45;cursor:not-allowed}
  `]
})
export class NewProjectDialogComponent {
  readonly visible = input(false);
  readonly close   = output<void>();
  private readonly state = inject(TaskState);

  name          = '';
  description   = '';
  template      = '';
  startDate     = '';
  targetEndDate = '';
  budget: number | null = null;
  memberInput = '';
  memberIds: string[] = [];
  selectedMembers: EmployeeDto[] = [];
  searchResults: EmployeeDto[] = [];
  showDropdown = false;
  private readonly employeeService = inject(EmployeeService);
  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => this.employeeService.search(q))
    ).subscribe(results => {
      this.searchResults = results.filter(r => !this.memberIds.includes(r.id));
      this.showDropdown = this.searchResults.length > 0;
    });
  }

  onSearchInput(): void {
    const q = this.memberInput.trim();
    if (q.length >= 1) this.searchSubject.next(q);
    else { this.searchResults = []; this.showDropdown = false; }
  }

  selectMember(emp: EmployeeDto): void {
    if (!this.memberIds.includes(emp.id)) {
      this.memberIds = [...this.memberIds, emp.id];
      this.selectedMembers = [...this.selectedMembers, emp];
    }
    this.memberInput = '';
    this.searchResults = [];
    this.showDropdown = false;
  }

  addMember(): void {}  // kept for compatibility

  removeMember(id: string): void {
    this.memberIds = this.memberIds.filter(m => m !== id);
    this.selectedMembers = this.selectedMembers.filter(m => m.id !== id);
  }

  submit(): void {
    if (!this.name.trim()) return;
    const req: CreateProjectRequest = {
      name:          this.name.trim(),
      description:   this.description.trim() || null,
      departmentId:  null,
      startDate:     this.startDate || null,
      targetEndDate: this.targetEndDate || null,
      budget:        this.budget,
      templateId:    null,
      memberIds:     this.memberIds.length > 0 ? this.memberIds : null,
    };
    this.state.createProject(req);
    this.reset();
    this.close.emit();
  }

  private reset(): void {
    this.name = ''; this.description = ''; this.template = '';
    this.startDate = ''; this.targetEndDate = ''; this.budget = null;
    this.memberInput = ''; this.memberIds = []; this.selectedMembers = []; this.searchResults = []; this.showDropdown = false;
  }
}




