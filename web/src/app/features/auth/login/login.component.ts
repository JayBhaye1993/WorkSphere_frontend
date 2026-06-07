import { Component, signal } from '@angular/core';
import { CommonModule }       from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService }      from '../../../core/auth/auth.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import {
  ICON_MAIL, ICON_LOCK, ICON_EYE, ICON_EYE_OFF, ICON_ARROW_RIGHT,
} from '../auth-icons';

@Component({
  selector:    'ws-login',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
  styleUrls:   ['./login.component.scss'],
})
export class LoginComponent {
  // ── Form state ─────────────────────────────────────────────────
  email       = '';
  password    = '';
  rememberMe  = false;

  // ── UI state ───────────────────────────────────────────────────
  showPassword = signal(false);
  isLoading    = signal(false);
  errorMessage = signal('');

  // ── Icon references for template ───────────────────────────────
  readonly iconMail       = ICON_MAIL;
  readonly iconLock       = ICON_LOCK;
  readonly iconEye        = ICON_EYE;
  readonly iconEyeOff     = ICON_EYE_OFF;
  readonly iconArrowRight = ICON_ARROW_RIGHT;

  constructor(
    private auth:   AuthService,
    private router: Router,
  ) {}

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter your email and password.');
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (err) => {
        const msg = err?.error?.error ?? 'Invalid email or password. Please try again.';
        this.errorMessage.set(msg);
        this.isLoading.set(false);
      },
    });
  }
}
