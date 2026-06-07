import { Component, signal } from '@angular/core';
import { CommonModule }       from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { RouterLink }         from '@angular/router';
import { HttpClient }         from '@angular/common/http';

import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { environment }         from '../../../../environments/environment';
import {
  ICON_MAIL, ICON_ARROW_LEFT, ICON_ARROW_RIGHT, ICON_INFO, ICON_CHECK,
} from '../auth-icons';

@Component({
  selector:    'ws-forgot-password',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls:   ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  // ── Form state ─────────────────────────────────────────────────
  email = '';

  // ── UI state ───────────────────────────────────────────────────
  isLoading    = signal(false);
  isSuccess    = signal(false);
  errorMessage = signal('');

  // ── Icon references ────────────────────────────────────────────
  readonly iconMail       = ICON_MAIL;
  readonly iconArrowLeft  = ICON_ARROW_LEFT;
  readonly iconArrowRight = ICON_ARROW_RIGHT;
  readonly iconInfo       = ICON_INFO;
  readonly iconCheck      = ICON_CHECK;

  constructor(private http: HttpClient) {}

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage.set('Please enter your work email.');
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);

    this.http
      .post(`${environment.apiUrls.identity}/api/v1/auth/forgot-password`, {
        email: this.email,
      })
      .subscribe({
        next:  () => {
          this.isSuccess.set(true);
          this.isLoading.set(false);
        },
        error: () => {
          // Always show success to prevent email enumeration
          this.isSuccess.set(true);
          this.isLoading.set(false);
        },
      });
  }
}
