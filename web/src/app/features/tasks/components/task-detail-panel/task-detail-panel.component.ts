import {
  Component, input, output, inject, OnChanges,
  signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import {
  TaskDetailDto, TaskCommentDto, TimeLogDto, SubtaskDto,
  TaskActivityDto, TaskPriority, TaskStatus, PRIORITY_CONFIG, KANBAN_COLUMNS
} from '../../models/task.models';
import {
  LucideX, LucideCopy, LucideEye, LucideStar, LucideLink, LucideEllipsis,
  LucideChevronDown, LucidePlay, LucideSparkles, LucideCheck,
  LucideUser, LucideCalendar, LucideLayoutList, LucideClock, LucideTag,
  LucideAlignLeft, LucideCheckSquare, LucidePlus, LucideTimer,
  LucideAtSign, LucidePaperclip, LucideSmile, LucideAlertCircle
} from '@lucide/angular';

type PanelTab = 'comments' | 'activity' | 'worklog';

@Component({
  selector: 'ws-task-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule,
    LucideX, LucideCopy, LucideEye, LucideStar, LucideLink, LucideEllipsis,
    LucideChevronDown, LucidePlay, LucideSparkles, LucideCheck,
    LucideUser, LucideCalendar, LucideLayoutList, LucideClock, LucideTag,
    LucideAlignLeft, LucideCheckSquare, LucidePlus, LucideTimer,
    LucideAtSign, LucidePaperclip, LucideSmile, LucideAlertCircle],
  template: `
@if (taskId()) {
  <!-- Scrim -->
  <div class="scrim" (click)="close.emit()"></div>

  <!-- Drawer -->
  <div class="drawer" role="dialog" [attr.aria-label]="task()?.title ?? 'Task detail'">

    <!-- ── HEADER ── -->
    <div class="dh">
      <div class="dh-left">
        <span class="breadcrumb">
          <span class="bc-dot" [style.background]="projectColor()"></span>
          <span class="bc-proj">{{ 'Project' }}</span>
          <span class="bc-sep">/</span>
          <span class="bc-id" (click)="copyId()" title="Copy task ID">
            {{ shortId() }}
            <svg lucideCopy [size]="11" class="copy-icon"></svg>
          </span>
        </span>
      </div>
      <div class="dh-actions">
        <button class="icon-btn" title="Watch"><svg lucideEye [size]="16"></svg></button>
        <button class="icon-btn" title="Star"><svg lucideStar [size]="16"></svg></button>
        <button class="icon-btn" title="Share" (click)="copyLink()"><svg lucideLink [size]="16"></svg></button>
        <button class="icon-btn" title="More"><svg lucideEllipsis [size]="16"></svg></button>
        <button class="icon-btn close-x" title="Close (Esc)" (click)="close.emit()">
          <svg lucideX [size]="16"></svg>
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="skeleton-wrap">
        <div class="sk sk-title"></div>
        <div class="sk sk-line"></div>
        <div class="sk sk-line sk-short"></div>
      </div>
    } @else if (error()) {
      <div class="err-state">
        <svg lucideAlertCircle [size]="36"></svg>
        <p>{{ error() }}</p>
        <button class="btn-retry" (click)="load()">Retry</button>
      </div>
    } @else if (task()) {

      <!-- ── STATUS + PRIORITY + START WORK ── -->
      <div class="status-bar">
        <!-- Status pill -->
        <div class="pill-wrap" [class.open]="statusOpen()">
          <button class="pill status-pill status-{{ task()!.status | lowercase }}"
            (click)="statusOpen.set(!statusOpen())">
            <span class="pill-dot" [style.background]="statusDot(task()!.status)"></span>
            {{ fmtStatus(task()!.status) }}
            <svg lucideChevronDown [size]="12"></svg>
          </button>
          @if (statusOpen()) {
            <div class="dropdown" (clickOutside)="statusOpen.set(false)">
              @for (s of STATUSES; track s.value) {
                <button class="dd-item" (click)="changeStatus(s.value)">
                  <span class="dd-dot" [style.background]="s.color"></span>{{ s.label }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Priority pill -->
        <div class="pill-wrap" [class.open]="priorityOpen()">
          <button class="pill priority-pill"
            [style.color]="PC[task()!.priority]?.text"
            [style.background]="PC[task()!.priority]?.bg"
            (click)="priorityOpen.set(!priorityOpen())">
            <span class="pill-dot" [style.background]="PC[task()!.priority]?.swatch"></span>
            {{ task()!.priority }}
            <svg lucideChevronDown [size]="12"></svg>
          </button>
          @if (priorityOpen()) {
            <div class="dropdown">
              @for (p of PRIORITIES; track p) {
                <button class="dd-item" (click)="changePriority(p)">
                  <span class="dd-dot" [style.background]="PC[p]?.swatch"></span>{{ p }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Start work button -->
        <button class="btn-start" (click)="quickAdvance()">
          <svg lucidePlay [size]="13"></svg>
          {{ startLabel() }}
        </button>

        <!-- Watchers -->
        <div class="watcher-stack">
          <div class="watcher-avatar">M</div>
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="dbody">

        <!-- ── TITLE ── -->
        <h2 class="task-title"
          [contentEditable]="editingTitle()"
          (click)="editingTitle.set(true)"
          (blur)="commitTitle($event)"
          (keydown.enter)="$event.preventDefault(); commitTitle($event)"
          (keydown.escape)="editingTitle.set(false)"
          [class.editing]="editingTitle()">{{ task()!.title }}</h2>

        <!-- ── AI SUGGESTION CARD ── -->
        @if (task()!.aiSuggestedPriority && task()!.aiSuggestedPriority !== task()!.priority) {
          <div class="ai-card">
            <div class="ai-card-header">
              <svg lucideSparkles [size]="14" class="ai-icon"></svg>
              <span class="ai-title">AI Priority Suggestion</span>
              <span class="ai-badge">CLAUDE</span>
            </div>
            <p class="ai-body">
              This task is <strong>{{ isOverdue() ? 'overdue' : 'active' }}</strong>.
              I recommend raising priority from
              <strong>{{ task()!.priority }}</strong> to
              <strong>{{ task()!.aiSuggestedPriority }}</strong>.
            </p>
            <div class="ai-actions">
              <button class="btn-apply" (click)="applyAiPriority()">
                <svg lucideCheck [size]="12"></svg>
                Raise to {{ task()!.aiSuggestedPriority }}
              </button>
              <button class="btn-dismiss" (click)="dismissAi()">Dismiss</button>
            </div>
          </div>
        }

        <!-- ── PROPERTIES GRID ── -->
        <div class="props">
          <div class="prop-row prop-row-click" (click)="assigneeOpen.set(!assigneeOpen())">
            <span class="prop-label"><svg lucideUser [size]="13"></svg> Assignee</span>
            <span class="prop-val">
              @if (task()!.assigneeName) {
                <span class="avatar-chip">
                  <span class="avatar-sm" [style.background]="memberColor(task()!.assigneeName!)">{{ task()!.assigneeName![0] }}</span>
                  {{ task()!.assigneeName }}
                </span>
              } @else { <span class="prop-empty">Click to assign</span> }
            </span>
            <svg lucideChevronDown [size]="12" class="prop-chevron"></svg>
          </div>
          @if (assigneeOpen()) {
            <div class="assignee-dropdown">
              <div class="assignee-dd-item" (click)="$event.stopPropagation(); changeAssignee(null, null)">
                <span class="assignee-avatar-none">—</span>
                <span class="assignee-name">Unassigned</span>
              </div>
              @for (m of members(); track m.employeeId) {
                <div class="assignee-dd-item" [class.selected]="m.employeeId === task()!.assigneeId"
                  (click)="$event.stopPropagation(); changeAssignee(m.employeeId, m.fullName)">
                  <span class="assignee-avatar" [style.background]="memberColor(m.fullName)">{{ m.fullName[0] }}</span>
                  <div class="assignee-info">
                    <span class="assignee-name">{{ m.fullName }}</span>
                    @if (m.designation) { <span class="assignee-role">{{ m.designation }}</span> }
                  </div>
                  @if (m.employeeId === task()!.assigneeId) {
                    <svg lucideCheck [size]="13" class="assignee-check"></svg>
                  }
                </div>
              }
            </div>
          }
          <div class="prop-row">
            <span class="prop-label"><svg lucideUser [size]="13"></svg> Reporter</span>
            <span class="prop-val">
              @if (task()!.reporterName) {
                <span class="avatar-chip">
                  <span class="avatar-sm">{{ task()!.reporterName![0] }}</span>
                  {{ task()!.reporterName }}
                </span>
              } @else { <span class="prop-empty">—</span> }
            </span>
          </div>
          <div class="prop-row">
            <span class="prop-label"><svg lucideCalendar [size]="13"></svg> Due date</span>
            <span class="prop-val" [class.overdue-val]="isOverdue()">
              @if (task()!.dueDate) {
                {{ fmtDate(task()!.dueDate!) }}
                @if (isOverdue()) { <span class="overdue-chip">Overdue</span> }
              } @else { <span class="prop-empty">No due date</span> }
            </span>
          </div>
          <div class="prop-row">
            <span class="prop-label"><svg lucideLayoutList [size]="13"></svg> Sprint</span>
            <span class="prop-val prop-empty">Backlog — not scheduled</span>
          </div>
          <div class="prop-row">
            <span class="prop-label"><svg lucideClock [size]="13"></svg> Estimate</span>
            <span class="prop-val">
              @if (task()!.estimatedHours) { {{ task()!.estimatedHours }}h }
              @else { <span class="prop-empty">Not set</span> }
            </span>
          </div>
          @if (task()!.tags.length > 0) {
            <div class="prop-row">
              <span class="prop-label"><svg lucideTag [size]="13"></svg> Tags</span>
              <span class="prop-val tags-row">
                @for (tag of task()!.tags; track tag) {
                  <span class="tag-chip">{{ tag }} <span class="tag-x">×</span></span>
                }
                <button class="tag-add">+ Add</button>
              </span>
            </div>
          }
        </div>

        <!-- ── DESCRIPTION ── -->
        @if (task()!.description) {
          <div class="section-block">
            <div class="section-label">
              <svg lucideAlignLeft [size]="13"></svg> DESCRIPTION
            </div>
            <p class="desc-text">{{ task()!.description }}</p>
          </div>
        }

        <!-- ── SUBTASKS ── -->
        <div class="section-block">
          <div class="section-label-row">
            <div class="section-label">
              <svg lucideCheckSquare [size]="13"></svg>
              SUBTASKS
              <span class="count-chip">{{ doneCount() }}/{{ subtasks().length }}</span>
            </div>
            <span class="section-right">Progress</span>
          </div>
          <!-- progress bar -->
          <div class="subtask-bar">
            <div class="subtask-fill" [style.width.%]="subtaskPct()"></div>
          </div>
          <div class="subtask-pct-row">
            <span></span><span class="subtask-pct">{{ subtaskPct() }}%</span>
          </div>
          <!-- list -->
          @for (s of subtasks(); track s.id) {
            <div class="subtask-row" [class.done]="s.done">
              <input type="checkbox" class="subtask-cb" [checked]="s.done"
                (change)="toggleSubtask(s)">
              <span class="subtask-title">{{ s.title }}</span>
              @if (s.dueDate) {
                <span class="subtask-due" [class.overdue-val]="isDateOverdue(s.dueDate)">
                  {{ fmtDateShort(s.dueDate) }}
                </span>
              }
              @if (s.assigneeName) {
                <span class="subtask-avatar">{{ s.assigneeName[0] }}</span>
              }
              <button class="subtask-del" (click)="deleteSubtask(s)">
                <svg lucideX [size]="11"></svg>
              </button>
            </div>
          }
          <!-- add subtask -->
          @if (addingSubtask()) {
            <div class="subtask-input-row">
              <input class="subtask-input" [(ngModel)]="newSubtaskTitle"
                placeholder="Subtask title…"
                (keydown.enter)="submitSubtask()"
                (keydown.escape)="addingSubtask.set(false)"
                autofocus>
              <button class="btn-xs btn-primary" (click)="submitSubtask()">Add</button>
              <button class="btn-xs" (click)="addingSubtask.set(false)">Cancel</button>
            </div>
          } @else {
            <button class="btn-add-subtask" (click)="addingSubtask.set(true)">
              <svg lucidePlus [size]="13"></svg> Add subtask
            </button>
          }
        </div>

        <!-- ── TIME TRACKING ── -->
        <div class="section-block">
          <div class="section-label">
            <svg lucideTimer [size]="13"></svg> TIME TRACKING
          </div>
          <div class="time-track-card">
            <div class="time-track-row">
              <div class="time-logged">
                <span class="time-num">{{ task()!.loggedHours }}h</span>
                <span class="time-lbl">logged</span>
              </div>
              <button class="btn-log-time" (click)="logTimeOpen.set(!logTimeOpen())">
                <svg lucidePlus [size]="13"></svg> Log time
              </button>
              @if (task()!.estimatedHours) {
                <div class="time-est">
                  <span class="time-num">{{ task()!.estimatedHours }}h</span>
                  <span class="time-lbl">estimated</span>
                </div>
              }
            </div>
            <!-- fill bar -->
            <div class="time-bar">
              <div class="time-fill"
                [style.width.%]="timePct()"
                [class.over]="timePct() > 100"></div>
            </div>
            <div class="time-rem-row">
              <span class="time-rem">
                @if (task()!.estimatedHours) {
                  {{ remaining() }}h remaining
                }
              </span>
              <span class="time-pct">{{ timePct() }}% of estimate</span>
            </div>
            <!-- log time form -->
            @if (logTimeOpen()) {
              <div class="log-form">
                <input class="log-input" [(ngModel)]="logHours" type="number" min="0.5" step="0.5"
                  placeholder="Hours (e.g. 2.5)">
                <input class="log-input" [(ngModel)]="logDesc" placeholder="Note (optional)">
                <div class="log-form-btns">
                  <button class="btn-xs btn-primary" (click)="submitLogTime()">Save</button>
                  <button class="btn-xs" (click)="logTimeOpen.set(false)">Cancel</button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── ACTIVITY TABS ── -->
        <div class="section-block tabs-block">
          <div class="tabs-row">
            <button class="tab-btn" [class.active]="activeTab() === 'comments'"
              (click)="switchTab('comments')">
              Comments <span class="tab-count">{{ task()!.comments.length }}</span>
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'activity'"
              (click)="switchTab('activity')">
              Activity
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'worklog'"
              (click)="switchTab('worklog')">
              Work log
            </button>
          </div>

          <!-- Comments tab -->
          @if (activeTab() === 'comments') {
            @if (task()!.comments.length === 0) {
              <div class="empty-tab">
                <p>No comments yet. Start the conversation —
                  <span class="mention-hint">&#64;mention</span> a teammate to notify them.
                </p>
              </div>
            } @else {
              <div class="comments-list">
                @for (c of task()!.comments; track c.id) {
                  <div class="comment-row">
                    <span class="c-avatar">{{ (c.authorName ?? 'U')[0].toUpperCase() }}</span>
                    <div class="c-body">
                      <div class="c-meta">
                        <span class="c-author">{{ c.authorName ?? 'Unknown' }}</span>
                        <span class="c-date">{{ fmtRelative(c.createdAt) }}</span>
                      </div>
                      <p class="c-text">{{ c.body }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- Activity tab -->
          @if (activeTab() === 'activity') {
            @if (activity().length === 0) {
              <div class="empty-tab"><p>No activity yet.</p></div>
            } @else {
              <div class="activity-feed">
                @for (a of activity(); track a.id) {
                  <div class="act-row">
                    <span class="act-dot act-{{ a.eventType }}"></span>
                    <div class="act-body">
                      <span class="act-actor">{{ a.actorName }}</span>
                      {{ fmtActivity(a) }}
                      <span class="act-date">{{ fmtRelative(a.createdAt) }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- Work log tab -->
          @if (activeTab() === 'worklog') {
            @if (task()!.timeLogs.length === 0) {
              <div class="empty-tab"><p>No time logged yet.</p></div>
            } @else {
              <div class="worklog-list">
                @for (l of task()!.timeLogs; track l.id) {
                  <div class="wl-row">
                    <span class="wl-avatar">{{ (l.loggedByName ?? 'U')[0] }}</span>
                    <div class="wl-body">
                      <span class="wl-who">{{ l.loggedByName ?? 'Unknown' }}</span>
                      <span class="wl-hours">{{ l.hours }}h</span>
                      @if (l.description) { <span class="wl-note">{{ l.description }}</span> }
                    </div>
                    <span class="wl-date">{{ fmtRelative(l.loggedAt) }}</span>
                  </div>
                }
              </div>
            }
          }
        </div>

      </div><!-- /dbody -->

      <!-- ── STICKY COMMENT COMPOSER ── -->
      @if (activeTab() === 'comments') {
        <div class="composer">
          <span class="composer-avatar">M</span>
          <div class="composer-wrap">
            <textarea class="composer-input" [(ngModel)]="newComment" rows="2"
              placeholder="Add a comment… Use @ to mention"
              (keydown.meta.enter)="submitComment()"
              (keydown.control.enter)="submitComment()"></textarea>
            <div class="composer-toolbar">
              <button class="toolbar-btn" title="@mention">
                <svg lucideAtSign [size]="15"></svg>
              </button>
              <button class="toolbar-btn" title="Attach">
                <svg lucidePaperclip [size]="15"></svg>
              </button>
              <button class="toolbar-btn" title="Emoji">
                <svg lucideSmile [size]="15"></svg>
              </button>
              <button class="btn-comment" [disabled]="!newComment.trim()"
                (click)="submitComment()">Comment</button>
            </div>
          </div>
        </div>
      }

    }
  </div><!-- /drawer -->
}
  `,
  styles: [`
    /* ── Layout ── */
    .scrim  { position:fixed; inset:0; background:rgba(15,23,42,.28); z-index:400; }
    .drawer { position:fixed; top:0; right:0; bottom:0; width:560px; background:#fff; z-index:401;
      display:flex; flex-direction:column; box-shadow:-12px 0 40px rgba(15,23,42,.13);
      animation:slideIn .34s cubic-bezier(.22,.7,.27,1); overflow:hidden; }
    @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
    @media(max-width:1100px){ .drawer{ width:100%; } }

    /* ── Header ── */
    .dh { display:flex; align-items:center; justify-content:space-between;
      padding:12px 20px; border-bottom:1px solid #e2e8f0; gap:10px; flex-shrink:0; }
    .dh-left { display:flex; align-items:center; gap:8px; min-width:0; }
    .breadcrumb { display:flex; align-items:center; gap:5px; font-size:12px; color:#64748b; }
    .bc-dot { width:8px; height:8px; border-radius:50%; background:#4f46e5; flex-shrink:0; }
    .bc-proj { font-weight:500; color:#334155; }
    .bc-sep { color:#cbd5e1; }
    .bc-id { font-family:monospace; font-size:11px; font-weight:600; color:#4f46e5;
      cursor:pointer; display:flex; align-items:center; gap:3px;
      padding:1px 6px; border-radius:4px; background:#f0f0ff; }
    .bc-id:hover { background:#e0e0ff; }
    .copy-icon { opacity:.6; }
    .dh-actions { display:flex; align-items:center; gap:2px; }
    .icon-btn { width:30px; height:30px; border:none; background:none; border-radius:7px;
      display:grid; place-items:center; color:#64748b; cursor:pointer; }
    .icon-btn:hover { background:#f1f5f9; color:#334155; }
    .close-x { color:#94a3b8; }

    /* ── Skeleton ── */
    .skeleton-wrap { padding:24px 20px; display:flex; flex-direction:column; gap:12px; }
    .sk { border-radius:6px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
      background-size:200% 100%; animation:shimmer 1.4s infinite; }
    .sk-title { height:24px; width:70%; }
    .sk-line  { height:14px; width:90%; }
    .sk-short { width:50%; }
    @keyframes shimmer { to{background-position:-200% 0} }

    /* ── Error ── */
    .err-state { display:flex; flex-direction:column; align-items:center; justify-content:center;
      flex:1; gap:12px; color:#94a3b8; padding:40px; }
    .btn-retry { padding:6px 16px; border-radius:8px; border:1.5px solid #e2e8f0;
      background:#fff; cursor:pointer; font-size:13px; }

    /* ── Status bar ── */
    .status-bar { display:flex; align-items:center; gap:8px; padding:10px 20px;
      border-bottom:1px solid #f1f5f9; flex-shrink:0; flex-wrap:wrap; }
    .pill-wrap { position:relative; }
    .pill { display:flex; align-items:center; gap:5px; height:28px; padding:0 10px;
      border-radius:999px; border:1.5px solid transparent; font-size:12px; font-weight:600;
      cursor:pointer; transition:opacity .15s; }
    .pill:hover { opacity:.85; }
    .status-pill { border-color:#e2e8f0; background:#f8fafc; color:#475569; }
    .status-todo       .pill-dot,.status-pill.status-todo       { color:#64748b; }
    .status-inprogress .pill-dot,.status-pill.status-inprogress { color:#2563eb; }
    .status-blocked    .pill-dot,.status-pill.status-blocked    { color:#dc2626; }
    .status-inreview   .pill-dot,.status-pill.status-inreview   { color:#7c3aed; }
    .status-done       .pill-dot,.status-pill.status-done       { color:#16a34a; }
    .pill-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .dropdown { position:absolute; top:calc(100% + 4px); left:0; min-width:150px;
      background:#fff; border:1px solid #e2e8f0; border-radius:10px;
      box-shadow:0 8px 24px rgba(15,23,42,.12); z-index:50; overflow:hidden; }
    .dd-item { display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px;
      border:none; background:none; cursor:pointer; font-size:13px; text-align:left; }
    .dd-item:hover { background:#f8fafc; }
    .dd-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .btn-start { display:flex; align-items:center; gap:5px; height:28px; padding:0 12px;
      border-radius:999px; border:none; background:#4f46e5; color:#fff;
      font-size:12px; font-weight:600; cursor:pointer; }
    .btn-start:hover { background:#4338ca; }
    .watcher-stack { display:flex; align-items:center; margin-left:auto; }
    .watcher-avatar { width:26px; height:26px; border-radius:50%; background:#4f46e5;
      color:#fff; font-size:10px; font-weight:700; display:grid; place-items:center;
      border:2px solid #fff; }

    /* ── Scrollable body ── */
    .dbody { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:20px; }

    /* ── Title ── */
    .task-title { font-size:19px; font-weight:700; color:#0f172a; line-height:1.3;
      margin:0; outline:none; border-radius:6px; padding:2px 4px; cursor:text; }
    .task-title.editing { background:#f8fafc; box-shadow:0 0 0 2px #4f46e5; }

    /* ── AI Card ── */
    .ai-card { border-radius:12px; border:1.5px solid #e9d5ff; background:#faf5ff;
      padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
    .ai-card-header { display:flex; align-items:center; gap:7px; }
    .ai-icon { color:#9333ea; }
    .ai-title { font-size:13px; font-weight:700; color:#7e22ce; }
    .ai-badge { font-size:10px; font-weight:700; padding:1px 7px; border-radius:999px;
      background:#9333ea; color:#fff; }
    .ai-body { font-size:13px; color:#6b21a8; margin:0; line-height:1.5; }
    .ai-actions { display:flex; gap:8px; }
    .btn-apply { display:flex; align-items:center; gap:5px; padding:5px 12px;
      border-radius:8px; border:none; background:#9333ea; color:#fff;
      font-size:12px; font-weight:600; cursor:pointer; }
    .btn-dismiss { padding:5px 12px; border-radius:8px; border:1.5px solid #e9d5ff;
      background:#fff; color:#7e22ce; font-size:12px; cursor:pointer; }

    /* ── Properties ── */
    .props { background:#f8fafc; border-radius:12px; padding:4px 0; }
    .prop-row { display:flex; align-items:center; padding:9px 14px; gap:10px;
      border-bottom:1px solid #f1f5f9; }
    .prop-row:last-child { border-bottom:none; }
    .prop-label { display:flex; align-items:center; gap:5px; font-size:12px;
      font-weight:500; color:#94a3b8; width:90px; flex-shrink:0; }
    .prop-val { font-size:13px; color:#334155; display:flex; align-items:center; flex-wrap:wrap; gap:5px; }
    .prop-empty { color:#cbd5e1; }
    .overdue-val { color:#dc2626; font-weight:600; }
    .overdue-chip { font-size:10px; font-weight:700; padding:1px 6px; border-radius:999px;
      background:#fef2f2; color:#dc2626; margin-left:4px; }
    .avatar-chip { display:flex; align-items:center; gap:6px; }
    .avatar-sm { width:20px; height:20px; border-radius:50%; background:#4f46e5;
      color:#fff; font-size:9px; font-weight:700; display:grid; place-items:center; flex-shrink:0; }
    .tags-row { display:flex; flex-wrap:wrap; gap:4px; }
    .tag-chip { display:flex; align-items:center; gap:3px; font-size:11px; padding:2px 8px;
      border-radius:5px; background:#f1f5f9; color:#475569; }
    .tag-x { cursor:pointer; opacity:.5; }
    .tag-add { border:1.5px dashed #cbd5e1; background:none; border-radius:5px;
      font-size:11px; color:#94a3b8; padding:2px 8px; cursor:pointer; }

    /* ── Section block ── */
    .section-block { display:flex; flex-direction:column; gap:10px; }
    .section-label { display:flex; align-items:center; gap:5px;
      font-size:11px; font-weight:600; color:#94a3b8; letter-spacing:.04em; }
    .section-label-row { display:flex; align-items:center; justify-content:space-between; }
    .section-right { font-size:11px; color:#94a3b8; font-weight:600; }
    .count-chip { background:#f1f5f9; color:#64748b; font-size:10px; font-weight:700;
      padding:1px 6px; border-radius:999px; margin-left:4px; }

    /* ── Description ── */
    .desc-text { font-size:13.5px; color:#334155; line-height:1.65; margin:0;
      background:#f8fafc; border-radius:10px; padding:12px 14px; white-space:pre-wrap; }

    /* ── Subtasks ── */
    .subtask-bar { height:5px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
    .subtask-fill { height:100%; background:#4f46e5; border-radius:999px; transition:width .3s; }
    .subtask-pct-row { display:flex; justify-content:flex-end; }
    .subtask-pct { font-size:11px; color:#94a3b8; font-variant-numeric:tabular-nums; }
    .subtask-row { display:flex; align-items:center; gap:8px; padding:7px 2px;
      border-bottom:1px solid #f8fafc; }
    .subtask-row.done .subtask-title { text-decoration:line-through; color:#94a3b8; }
    .subtask-cb { width:15px; height:15px; accent-color:#4f46e5; cursor:pointer; flex-shrink:0; }
    .subtask-title { flex:1; font-size:13px; color:#334155; }
    .subtask-due { font-size:11px; color:#94a3b8; font-variant-numeric:tabular-nums; }
    .subtask-avatar { width:20px; height:20px; border-radius:50%; background:#7c3aed;
      color:#fff; font-size:9px; font-weight:700; display:grid; place-items:center; }
    .subtask-del { border:none; background:none; color:#cbd5e1; cursor:pointer;
      display:grid; place-items:center; opacity:0; transition:opacity .1s; }
    .subtask-row:hover .subtask-del { opacity:1; }
    .subtask-input-row { display:flex; gap:6px; align-items:center; padding-top:6px; }
    .subtask-input { flex:1; border:1.5px solid #4f46e5; border-radius:7px;
      padding:5px 10px; font-size:13px; outline:none; }
    .btn-add-subtask { display:flex; align-items:center; gap:5px; border:none;
      background:none; color:#94a3b8; font-size:12.5px; cursor:pointer; padding:4px 0; }
    .btn-add-subtask:hover { color:#4f46e5; }

    /* ── Buttons xs ── */
    .btn-xs { height:26px; padding:0 10px; border-radius:6px; border:1.5px solid #e2e8f0;
      background:#fff; font-size:12px; cursor:pointer; }
    .btn-xs.btn-primary { background:#4f46e5; color:#fff; border-color:#4f46e5; }

    /* ── Time tracking ── */
    .time-track-card { background:#f8fafc; border-radius:12px; padding:14px 16px;
      display:flex; flex-direction:column; gap:10px; }
    .time-track-row { display:flex; align-items:center; gap:12px; }
    .time-logged,.time-est { display:flex; align-items:baseline; gap:4px; }
    .time-num { font-size:20px; font-weight:700; color:#0f172a;
      font-variant-numeric:tabular-nums; }
    .time-lbl { font-size:11px; color:#94a3b8; }
    .btn-log-time { display:flex; align-items:center; gap:4px; height:28px; padding:0 10px;
      border-radius:8px; border:1.5px solid #e2e8f0; background:#fff;
      font-size:12px; cursor:pointer; margin-left:auto; }
    .btn-log-time:hover { border-color:#4f46e5; color:#4f46e5; }
    .time-bar { height:5px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
    .time-fill { height:100%; background:#4f46e5; border-radius:999px; transition:width .3s; }
    .time-fill.over { background:#dc2626; }
    .time-rem-row { display:flex; justify-content:space-between;
      font-size:11px; color:#94a3b8; font-variant-numeric:tabular-nums; }
    .log-form { display:flex; flex-direction:column; gap:7px; padding-top:4px; }
    .log-input { border:1.5px solid #e2e8f0; border-radius:7px; padding:6px 10px;
      font-size:13px; outline:none; }
    .log-input:focus { border-color:#4f46e5; }
    .log-form-btns { display:flex; gap:6px; }

    /* ── Tabs ── */
    .tabs-block { gap:0; }
    .tabs-row { display:flex; gap:0; border-bottom:2px solid #f1f5f9; }
    .tab-btn { height:36px; padding:0 14px; border:none; background:none;
      font-size:13px; font-weight:500; color:#94a3b8; cursor:pointer;
      border-bottom:2px solid transparent; margin-bottom:-2px; transition:color .15s; }
    .tab-btn.active { color:#4f46e5; border-bottom-color:#4f46e5; font-weight:600; }
    .tab-count { font-size:11px; font-weight:600; padding:0 5px; border-radius:999px;
      background:#f1f5f9; color:#64748b; margin-left:4px; }

    /* ── Empty tab ── */
    .empty-tab { padding:20px 0; text-align:center; color:#94a3b8; font-size:13px; }
    .mention-hint { font-family:monospace; background:#f1f5f9; padding:1px 5px;
      border-radius:4px; color:#4f46e5; }

    /* ── Comments ── */
    .comments-list { display:flex; flex-direction:column; gap:14px; padding-top:12px; }
    .comment-row { display:flex; gap:10px; align-items:flex-start; }
    .c-avatar { width:28px; height:28px; border-radius:50%; background:#4f46e5;
      color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center;
      flex-shrink:0; }
    .c-body { flex:1; }
    .c-meta { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
    .c-author { font-size:12.5px; font-weight:600; color:#1e293b; }
    .c-date { font-size:11px; color:#94a3b8; }
    .c-text { font-size:13px; color:#334155; margin:0; line-height:1.55; }

    /* ── Activity ── */
    .activity-feed { display:flex; flex-direction:column; gap:10px; padding-top:12px; }
    .act-row { display:flex; align-items:flex-start; gap:10px; }
    .act-dot { width:8px; height:8px; border-radius:50%; background:#94a3b8;
      flex-shrink:0; margin-top:4px; }
    .act-dot.act-status   { background:#2563eb; }
    .act-dot.act-priority { background:#ea580c; }
    .act-dot.act-created  { background:#16a34a; }
    .act-body { font-size:12.5px; color:#475569; line-height:1.5; }
    .act-actor { font-weight:600; color:#1e293b; }
    .act-date { font-size:11px; color:#94a3b8; margin-left:6px; }

    /* ── Worklog ── */
    .worklog-list { display:flex; flex-direction:column; gap:8px; padding-top:10px; }
    .wl-row { display:flex; align-items:center; gap:10px;
      padding:8px 12px; background:#f8fafc; border-radius:8px; }
    .wl-avatar { width:24px; height:24px; border-radius:50%; background:#7c3aed;
      color:#fff; font-size:10px; font-weight:700; display:grid; place-items:center; flex-shrink:0; }
    .wl-body { flex:1; display:flex; align-items:center; gap:8px; font-size:13px; }
    .wl-who { font-weight:600; color:#334155; }
    .wl-hours { font-weight:700; color:#4f46e5; font-variant-numeric:tabular-nums; }
    .wl-note { color:#64748b; font-size:12px; }
    .wl-date { font-size:11px; color:#94a3b8; flex-shrink:0; }

    /* ── Composer ── */
    .composer { display:flex; align-items:flex-start; gap:10px;
      padding:12px 20px; border-top:1px solid #f1f5f9;
      background:#fff; flex-shrink:0; }
    .composer-avatar { width:28px; height:28px; border-radius:50%; background:#4f46e5;
      color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center;
      flex-shrink:0; margin-top:2px; }
    .composer-wrap { flex:1; border:1.5px solid #e2e8f0; border-radius:10px;
      overflow:hidden; transition:border-color .15s; }
    .composer-wrap:focus-within { border-color:#4f46e5; }
    .composer-input { width:100%; border:none; outline:none; padding:8px 12px;
      font-size:13px; font-family:inherit; color:#1e293b; resize:none;
      box-sizing:border-box; min-height:60px; }
    .composer-toolbar { display:flex; align-items:center; gap:2px; padding:6px 8px;
      border-top:1px solid #f1f5f9; background:#f8fafc; }
    .toolbar-btn { width:28px; height:28px; border:none; background:none;
      border-radius:6px; display:grid; place-items:center; color:#94a3b8; cursor:pointer; }
    .toolbar-btn:hover { background:#f1f5f9; color:#475569; }
    .btn-comment { margin-left:auto; height:28px; padding:0 14px; border-radius:7px;
      border:none; background:#4f46e5; color:#fff; font-size:12px; font-weight:600;
      cursor:pointer; }
    .btn-comment:disabled { opacity:.5; cursor:not-allowed; }
    .btn-comment:hover:not(:disabled) { background:#4338ca; }
  `]
})
export class TaskDetailPanelComponent implements OnChanges {
  readonly taskId = input<string | null>(null);
  readonly close  = output<void>();

  private readonly svc = inject(TaskService);

  readonly task     = signal<TaskDetailDto | null>(null);
  readonly subtasks = signal<SubtaskDto[]>([]);
  readonly activity    = signal<TaskActivityDto[]>([]);
  readonly members     = signal<any[]>([]);
  readonly assigneeOpen = signal(false);
  readonly loading  = signal(false);
  readonly error    = signal<string | null>(null);

  // UI state
  readonly statusOpen    = signal(false);
  readonly priorityOpen  = signal(false);
  readonly logTimeOpen   = signal(false);
  readonly addingSubtask = signal(false);
  readonly editingTitle  = signal(false);
  readonly activeTab     = signal<PanelTab>('comments');

  // Form values
  newComment     = '';
  newSubtaskTitle = '';
  logHours: number | null = null;
  logDesc  = '';

  // Constants
  readonly PC         = PRIORITY_CONFIG;
  readonly PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
  readonly STATUSES   = [
    { value: 'ToDo',       label: 'To Do',      color: '#94a3b8' },
    { value: 'InProgress', label: 'In Progress', color: '#2563eb' },
    { value: 'Blocked',    label: 'Blocked',     color: '#dc2626' },
    { value: 'InReview',   label: 'In Review',   color: '#7c3aed' },
    { value: 'Done',       label: 'Done',        color: '#16a34a' },
  ];

  ngOnChanges(): void { this.load(); }

  load(): void {
    const id = this.taskId();
    if (!id) { this.task.set(null); return; }
    this.loading.set(true);
    this.error.set(null);
    this.svc.getTaskById(id).subscribe({
      next: t => {
        this.task.set(t);
        this.loading.set(false);
        this.loadSubtasks(id);
        this.loadActivity(id);
        this.loadMembers(t.projectId);
      },
      error: () => { this.error.set('Failed to load task.'); this.loading.set(false); }
    });
  }

  loadSubtasks(id: string): void {
    this.svc.getSubtasks(id).subscribe({ next: s => this.subtasks.set(s) });
  }

  loadMembers(projectId: string): void {
    this.svc.getProjectMembers(projectId).subscribe({ next: m => this.members.set(m) });
  }

  loadActivity(id: string): void {
    this.svc.getActivity(id).subscribe({ next: a => this.activity.set(a) });
  }

  // ── Status / Priority ──
  changeStatus(newStatus: string): void {
    this.statusOpen.set(false);
    if (!this.task() || !this.taskId()) return;
    this.svc.updateTaskStatus(this.taskId()!, newStatus, this.task()!.position ?? 0)
      .subscribe({ next: () => this.load() });
  }

  changePriority(p: string): void {
    this.priorityOpen.set(false);
    if (!this.task() || !this.taskId()) return;
    const t = this.task()!;
    this.svc.updateTask(this.taskId()!, {
      title: t.title, description: t.description,
      assigneeId: t.assigneeId, dueDate: t.dueDate,
      priority: p, estimatedHours: t.estimatedHours, tags: t.tags
    }).subscribe({ next: () => this.load() });
  }

  quickAdvance(): void {
    const map: Record<string,string> = {
      ToDo: 'InProgress', InProgress: 'InReview', InReview: 'Done', Blocked: 'InProgress'
    };
    const next = map[this.task()?.status ?? ''];
    if (next) this.changeStatus(next);
  }

  changeAssignee(memberId: string | null, memberName: string | null): void {
    this.assigneeOpen.set(false);
    if (!this.task() || !this.taskId()) return;
    const t = this.task()!;
    this.svc.updateTask(this.taskId()!, {
      title: t.title, description: t.description,
      assigneeId: memberId, dueDate: t.dueDate,
      priority: t.priority, estimatedHours: t.estimatedHours, tags: t.tags
    }).subscribe({ next: () => {
      this.task.set({...t, assigneeId: memberId, assigneeName: memberName});
    }});
  }

  applyAiPriority(): void {
    const ai = this.task()?.aiSuggestedPriority;
    if (ai) this.changePriority(ai);
  }

  // ── Title ──
  commitTitle(event: Event): void {
    this.editingTitle.set(false);
    const el = event.target as HTMLElement;
    const newTitle = el.innerText.trim();
    if (!newTitle || !this.task() || newTitle === this.task()!.title) return;
    const t = this.task()!;
    this.svc.updateTask(this.taskId()!, {
      title: newTitle, description: t.description,
      assigneeId: t.assigneeId, dueDate: t.dueDate,
      priority: t.priority, estimatedHours: t.estimatedHours, tags: t.tags
    }).subscribe({ next: () => this.load() });
  }

  // ── Subtasks ──
  toggleSubtask(s: SubtaskDto): void {
    this.svc.toggleSubtask(this.taskId()!, s.id).subscribe({
      next: updated => {
        this.subtasks.update(list => list.map(x => x.id === s.id ? updated : x));
      }
    });
  }

  deleteSubtask(s: SubtaskDto): void {
    this.svc.deleteSubtask(this.taskId()!, s.id).subscribe({
      next: () => this.subtasks.update(list => list.filter(x => x.id !== s.id))
    });
  }

  submitSubtask(): void {
    if (!this.newSubtaskTitle.trim() || !this.taskId()) return;
    this.svc.createSubtask(this.taskId()!, {
      title: this.newSubtaskTitle.trim(),
      assigneeId: null, dueDate: null, order: this.subtasks().length
    }).subscribe({
      next: s => {
        this.subtasks.update(list => [...list, s]);
        this.newSubtaskTitle = '';
        this.addingSubtask.set(false);
      }
    });
  }

  // ── Comments ──
  submitComment(): void {
    if (!this.newComment.trim() || !this.taskId()) return;
    const body = this.newComment.trim();
    this.newComment = '';
    this.svc.addComment(this.taskId()!, body).subscribe({ next: () => this.load() });
  }

  // ── Time logging ──
  submitLogTime(): void {
    if (!this.logHours || !this.taskId()) return;
    this.svc.logTime(this.taskId()!, {
      loggedAt: new Date().toISOString().split('T')[0],
      hours: this.logHours,
      description: this.logDesc || null
    }).subscribe({
      next: () => {
        this.logHours = null;
        this.logDesc = '';
        this.logTimeOpen.set(false);
        this.load();
      }
    });
  }

  // ── Tab ──
  switchTab(tab: PanelTab): void { this.activeTab.set(tab); }

  // ── Computed ──
  doneCount()   { return this.subtasks().filter(s => s.done).length; }
  subtaskPct()  {
    const t = this.subtasks().length;
    return t === 0 ? 0 : Math.round(this.doneCount() / t * 100);
  }
  timePct()     {
    const t = this.task();
    if (!t?.estimatedHours || t.estimatedHours === 0) return 0;
    return Math.min(Math.round(t.loggedHours / t.estimatedHours * 100), 100);
  }
  remaining()   {
    const t = this.task();
    if (!t?.estimatedHours) return 0;
    return Math.max(0, t.estimatedHours - t.loggedHours);
  }

  isOverdue(): boolean {
    const d = this.task()?.dueDate;
    if (!d) return false;
    return new Date(d) < new Date() && this.task()?.status !== 'Done';
  }

  isDateOverdue(d: string): boolean {
    return new Date(d) < new Date();
  }

  startLabel(): string {
    const map: Record<string,string> = {
      ToDo: 'Start work', InProgress: 'Mark in review',
      InReview: 'Mark done', Blocked: 'Unblock'
    };
    return map[this.task()?.status ?? ''] ?? 'Start work';
  }

  shortId(): string { return this.task()?.id.slice(-8).toUpperCase() ?? ''; }
  projectColor()   { return '#4f46e5'; }

  statusDot(s: string): string {
    const map: Record<string,string> = {
      ToDo:'#94a3b8', InProgress:'#2563eb', Blocked:'#dc2626',
      InReview:'#7c3aed', Done:'#16a34a'
    };
    return map[s] ?? '#94a3b8';
  }

  fmtStatus(s: string): string {
    const map: Record<string,string> = {
      ToDo:'To Do', InProgress:'In Progress', Blocked:'Blocked',
      InReview:'In Review', Done:'Done'
    };
    return map[s] ?? s;
  }

  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN',
      { day:'numeric', month:'short', year:'numeric' });
  }

  fmtDateShort(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  }

  fmtRelative(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return this.fmtDate(d);
  }

  fmtActivity(a: TaskActivityDto): string {
    if (a.eventType === 'status')   return ` changed status to ${a.toValue}`;
    if (a.eventType === 'priority') return ` changed priority to ${a.toValue}`;
    if (a.eventType === 'created')  return ` created this task`;
    if (a.eventType === 'assignee') return ` assigned to ${a.toValue}`;
    if (a.eventType === 'comment')  return ` added a comment`;
    return ` updated ${a.fieldName ?? 'this task'}`;
  }

  memberColor(name: string): string {
    const colors = ["#4f46e5","#7c3aed","#0891b2","#059669","#d97706","#dc2626","#db2777"];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  }

  copyId(): void {
    navigator.clipboard.writeText(this.shortId());
  }

  dismissAi(): void { const t = this.task(); if (t) { (t as any).aiSuggestedPriority = null; this.task.set({...t, aiSuggestedPriority: null}); } }

  copyLink(): void {
    navigator.clipboard.writeText(`${window.location.origin}/tasks?task=${this.taskId()}`);
  }
}





