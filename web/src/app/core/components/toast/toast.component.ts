import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideCheck } from '@lucide/angular';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'ws-toast',
  standalone: true,
  imports: [CommonModule, LucideCheck],
  template: `
    <div class="toast-wrap">
      @for (toast of svc.toasts(); track toast.id) {
        <div class="toast">
          <svg lucideCheck [size]="15" class="toast-icon"></svg>
          <span>{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrap { position:fixed;bottom:22px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none; }
    .toast { display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:#0f172a;color:white;font-size:13px;font-weight:500;box-shadow:0 12px 32px rgba(15,23,42,.14);animation:rise .2s ease; }
    .toast-icon { color:#4f46e5;flex-shrink:0; }
    @keyframes rise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  `]
})
export class ToastComponent {
  readonly svc = inject(ToastService);
}
