import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div style="display:flex;min-height:100vh;font-family:Inter,Arial,sans-serif;">
      <aside style="width:240px;background:#1E3A5F;color:white;padding:24px 0;">
        <div style="padding:0 24px 24px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <h2 style="margin:0;font-size:20px;color:#60A5FA;">WorkSphere</h2>
        </div>
        <nav style="padding:16px 0;">
          <a href="/dashboard" style="display:block;padding:12px 24px;color:rgba(255,255,255,0.8);text-decoration:none;">Dashboard</a>
          <a href="/dashboard/employees" style="display:block;padding:12px 24px;color:rgba(255,255,255,0.8);text-decoration:none;">Employees</a>
        </nav>
      </aside>
      <main style="flex:1;background:#f8fafc;padding:32px;">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {}
