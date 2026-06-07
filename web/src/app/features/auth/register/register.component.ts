import { Component, signal } from '@angular/core';
import { CommonModule }       from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService }         from '../../../core/auth/auth.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import {
  ICON_MAIL, ICON_LOCK, ICON_EYE, ICON_EYE_OFF, ICON_ARROW_RIGHT,
} from '../auth-icons';

@Component({
  selector:    'ws-register',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './register.component.html',
  styleUrls:   ['./register.component.scss'],
})
export class RegisterComponent {
  // ── Form state ─────────────────────────────────────────────────
  fullName    = '';
  companyName = '';
  email       = '';
  password    = '';
  agreeTerms  = false;

  // ── UI state ───────────────────────────────────────────────────
  showPassword = signal(false);
  isLoading    = signal(false);
  errorMessage = signal('');

  // ── Icon references ────────────────────────────────────────────
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
    if (!this.fullName || !this.companyName || !this.email || !this.password) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }
    if (!this.agreeTerms) {
      this.errorMessage.set('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }
    if (this.password.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters.');
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);

    this.auth
      .register({
        fullName:    this.fullName,
        companyName: this.companyName,
        email:       this.email,
        password:    this.password,
      })
      .subscribe({
        next:  () => this.router.navigate(['/dashboard']),
        error: (err) => {
          const msg = err?.error?.error ?? 'Registration failed. Please try again.';
          this.errorMessage.set(msg);
          this.isLoading.set(false);
        },
      });
  }
}
