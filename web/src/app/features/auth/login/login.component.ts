import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;">
      <div style="background:white;padding:40px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);text-align:center;">
        <h1 style="color:#1A56B0;font-family:Inter,Arial,sans-serif;">WorkSphere</h1>
        <p style="color:#64748B;font-family:Arial,sans-serif;">Login component — coming soon</p>
      </div>
    </div>
  `,
})
export class LoginComponent {}
