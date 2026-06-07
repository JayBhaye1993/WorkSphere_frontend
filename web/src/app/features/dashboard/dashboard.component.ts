import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
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
  `,
})
export class DashboardComponent {
  constructor(public auth: AuthService) {}
}
