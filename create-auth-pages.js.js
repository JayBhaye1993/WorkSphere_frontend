const fs = require('fs');
const path = require('path');

const WEB = 'C:\\Projects\\WorkSphere_frontend\\web\\src\\app';

function write(filePath, content) {
  const full = path.join(...filePath.split('/'));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('✓ ' + full);
}

// ─────────────────────────────────────────────────────────────────
// SHARED AUTH STYLES
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/features/auth/_auth-shared.scss`, `
// ─── WorkSphere Auth Shared Styles ────────────────────────────────
// All auth pages import this file for consistent variables & utilities

// Color palette
$color-bg:          #F4F6F8;
$color-surface:     #FFFFFF;
$color-primary:     #1A1A1A;       // black CTA buttons
$color-primary-hover: #333333;
$color-brand:       #1A56B0;       // WorkSphere blue
$color-brand-hover: #1447A0;
$color-text:        #111827;
$color-text-muted:  #6B7280;
$color-text-light:  #9CA3AF;
$color-border:      #E5E7EB;
$color-input-bg:    #F3F4F6;
$color-input-focus: #1A56B0;
$color-error:       #DC2626;
$color-info-bg:     #EFF6FF;
$color-info-border: #BFDBFE;
$color-info-text:   #1D4ED8;
$color-success:     #166534;

// Typography
$font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

// Spacing
$radius-sm:   6px;
$radius-md:   10px;
$radius-lg:   14px;
$radius-xl:   20px;

// Shadows
$shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.06);

// ─── Auth page wrapper (centers the card on screen) ───────────────
.auth-page {
  min-height: 100vh;
  background-color: $color-bg;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px 48px;
  font-family: $font-family;
}

// ─── Logo above the card ──────────────────────────────────────────
.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;

  &__icon {
    width: 40px;
    height: 40px;
    background: $color-brand;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 22px;
      height: 22px;
      fill: white;
    }
  }

  &__name {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: $color-text;

    span {
      color: $color-brand;
    }
  }
}

// ─── Auth card ────────────────────────────────────────────────────
.auth-card {
  width: 100%;
  max-width: 480px;
  background: $color-surface;
  border-radius: $radius-xl;
  box-shadow: $shadow-card;
  padding: 40px;

  @media (max-width: 520px) {
    padding: 28px 20px;
    border-radius: $radius-lg;
  }
}

// ─── Card header ──────────────────────────────────────────────────
.auth-header {
  margin-bottom: 28px;

  &__title {
    font-size: 24px;
    font-weight: 700;
    color: $color-text;
    margin: 0 0 6px;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }

  &__subtitle {
    font-size: 14px;
    color: $color-text-muted;
    margin: 0;
    line-height: 1.5;
  }
}

// ─── Form field ───────────────────────────────────────────────────
.auth-field {
  margin-bottom: 16px;

  &__label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: $color-text;
    margin-bottom: 6px;
  }

  &__input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__icon {
    position: absolute;
    left: 14px;
    color: $color-text-light;
    display: flex;
    align-items: center;
    pointer-events: none;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  &__input {
    width: 100%;
    height: 46px;
    padding: 0 14px 0 42px;
    background: $color-input-bg;
    border: 1.5px solid transparent;
    border-radius: $radius-md;
    font-size: 14px;
    font-family: $font-family;
    color: $color-text;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    box-sizing: border-box;

    &::placeholder {
      color: $color-text-light;
    }

    &:focus {
      border-color: $color-input-focus;
      background: $color-surface;
    }

    &.has-error {
      border-color: $color-error;
    }

    // No left icon variant
    &--no-icon {
      padding-left: 14px;
    }

    // With right action (eye toggle)
    &--with-action {
      padding-right: 44px;
    }
  }

  &__action {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    cursor: pointer;
    color: $color-text-muted;
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.2s;

    &:hover {
      color: $color-text;
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }

  &__error {
    font-size: 12px;
    color: $color-error;
    margin-top: 4px;
  }
}

// ─── Row utilities ────────────────────────────────────────────────
.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;

  &--two-col {
    gap: 12px;

    .auth-field {
      flex: 1;
      margin-bottom: 0;
    }
  }
}

// ─── Checkbox row ─────────────────────────────────────────────────
.auth-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    border: 1.5px solid $color-border;
    border-radius: 4px;
    cursor: pointer;
    accent-color: $color-primary;
  }

  &__label {
    font-size: 14px;
    color: $color-text;
  }
}

// ─── Link ─────────────────────────────────────────────────────────
.auth-link {
  font-size: 14px;
  color: $color-text-muted;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: $color-text;
  }

  &--bold {
    font-weight: 600;
    color: $color-text;

    &:hover {
      color: $color-brand;
    }
  }

  &--brand {
    color: $color-brand;
    font-weight: 600;

    &:hover {
      color: $color-brand-hover;
    }
  }
}

// ─── Primary CTA button ───────────────────────────────────────────
.auth-btn {
  width: 100%;
  height: 50px;
  background: $color-primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: 15px;
  font-weight: 600;
  font-family: $font-family;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s, transform 0.1s;
  letter-spacing: 0.1px;

  &:hover:not(:disabled) {
    background: $color-primary-hover;
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  // Spinner inside button
  &__spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ─── Divider "Or continue with" ───────────────────────────────────
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;

  &__line {
    flex: 1;
    height: 1px;
    background: $color-border;
  }

  &__text {
    font-size: 13px;
    color: $color-text-muted;
    white-space: nowrap;
  }
}

// ─── SSO buttons ──────────────────────────────────────────────────
.auth-sso {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  &__btn {
    flex: 1;
    height: 46px;
    background: $color-surface;
    border: 1.5px solid $color-border;
    border-radius: $radius-md;
    font-size: 14px;
    font-weight: 500;
    font-family: $font-family;
    color: $color-text;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.2s, border-color 0.2s;

    &:hover {
      background: $color-bg;
      border-color: #D1D5DB;
    }
  }
}

// ─── Bottom text (sign up / sign in) ──────────────────────────────
.auth-bottom {
  text-align: center;
  font-size: 14px;
  color: $color-text-muted;
  margin-top: 20px;

  & + & {
    margin-top: 8px;
  }
}

// ─── Info box (reset password note) ──────────────────────────────
.auth-info-box {
  background: $color-info-bg;
  border: 1px solid $color-info-border;
  border-radius: $radius-md;
  padding: 14px 16px;
  display: flex;
  gap: 10px;
  margin-top: 16px;

  &__icon {
    flex-shrink: 0;
    margin-top: 1px;
    color: $color-info-text;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  &__text {
    font-size: 13px;
    color: $color-info-text;
    line-height: 1.55;
    margin: 0;
  }
}

// ─── Back link ───────────────────────────────────────────────────
.auth-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: $color-text-muted;
  cursor: pointer;
  text-decoration: none;
  margin-bottom: 24px;
  transition: color 0.2s;

  &:hover {
    color: $color-text;
  }

  svg {
    width: 15px;
    height: 15px;
  }
}

// ─── Error alert banner ───────────────────────────────────────────
.auth-alert {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: $radius-md;
  padding: 12px 14px;
  font-size: 13px;
  color: #B91C1C;
  margin-bottom: 16px;
}

// ─── Success state ───────────────────────────────────────────────
.auth-success {
  text-align: center;
  padding: 16px 0 8px;

  &__icon {
    width: 52px;
    height: 52px;
    background: #DCFCE7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;

    svg {
      width: 24px;
      height: 24px;
      color: $color-success;
    }
  }

  &__title {
    font-size: 18px;
    font-weight: 700;
    color: $color-text;
    margin: 0 0 8px;
  }

  &__text {
    font-size: 14px;
    color: $color-text-muted;
    margin: 0;
    line-height: 1.55;
  }
}

// ─── Footer ───────────────────────────────────────────────────────
.auth-footer {
  margin-top: 32px;
  text-align: center;

  &__links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    color: $color-text-muted;
    margin-bottom: 8px;

    a {
      color: $color-text-muted;
      text-decoration: none;

      &:hover {
        color: $color-text;
      }
    }

    span {
      color: $color-border;
    }
  }

  &__copy {
    font-size: 12px;
    color: $color-text-light;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    svg {
      width: 13px;
      height: 13px;
      color: #22C55E;
    }
  }
}
`);

// ─────────────────────────────────────────────────────────────────
// SHARED SVG ICONS (inline, so no external deps)
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/features/auth/auth-icons.ts`, `
// SVG icon strings used across all auth components
// Keep as constants so templates stay clean

export const ICON_MAIL = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
  <path stroke-linecap="round" stroke-linejoin="round"
    d="M2.5 6.5A2 2 0 0 1 4.5 4.5h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-7z"/>
  <path stroke-linecap="round" stroke-linejoin="round" d="m2.5 7 7.5 5 7.5-5"/>
</svg>\`;

export const ICON_LOCK = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
  <rect x="4" y="9" width="12" height="9" rx="2" stroke-linecap="round"/>
  <path stroke-linecap="round" stroke-linejoin="round"
    d="M7 9V6a3 3 0 0 1 6 0v3"/>
</svg>\`;

export const ICON_EYE = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
  <path stroke-linecap="round" stroke-linejoin="round"
    d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10z"/>
  <circle cx="10" cy="10" r="2.5"/>
</svg>\`;

export const ICON_EYE_OFF = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
  <path stroke-linecap="round" stroke-linejoin="round"
    d="M3 3l14 14M8.5 8.6A3 3 0 0 0 10 13c1.66 0 3-1.34 3-3 0-.54-.14-1.04-.4-1.47"/>
  <path stroke-linecap="round" stroke-linejoin="round"
    d="M6.3 6.3C4.7 7.3 3.4 8.6 2.5 10s3 5.5 7.5 5.5c1.5 0 2.9-.4 4.1-1.1M14 14c1.5-1 2.8-2.3 3.5-4-1-2.5-3.9-5.5-7.5-5.5-.9 0-1.7.15-2.5.4"/>
</svg>\`;

export const ICON_ARROW_RIGHT = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M4 10h12M11 5l5 5-5 5"/>
</svg>\`;

export const ICON_ARROW_LEFT = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16 10H4M9 5L4 10l5 5"/>
</svg>\`;

export const ICON_INFO = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
  <circle cx="10" cy="10" r="7.5"/>
  <path stroke-linecap="round" d="M10 9.5v4"/>
  <circle cx="10" cy="7" r="0.5" fill="currentColor"/>
</svg>\`;

export const ICON_CHECK = \`
<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M4 10l4.5 4.5 7.5-8"/>
</svg>\`;

export const ICON_SHIELD = \`
<svg viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd"
    d="M10 1.5l7 3v5c0 3.9-2.9 7.5-7 8.5-4.1-1-7-4.6-7-8.5v-5l7-3z"
    clip-rule="evenodd"/>
</svg>\`;

export const WORKSPHERE_LOGO = \`
<svg viewBox="0 0 24 24" fill="white">
  <path d="M12 2L3 7v5c0 5.25 3.9 10.14 9 11.25C17.1 22.14 21 17.25 21 12V7l-9-5z"
    opacity="0.4"/>
  <path d="M12 5L6 8.5V12c0 3.3 2.45 6.38 6 7.2 3.55-.82 6-3.9 6-7.2V8.5L12 5z"
    opacity="0.7"/>
  <path d="M8.5 12l2 2 5-5" stroke="white" stroke-width="1.5"
    fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\`;
`);

// ─────────────────────────────────────────────────────────────────
// AUTH LAYOUT COMPONENT (logo + footer wrapper)
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/features/auth/auth-layout/auth-layout.component.ts`, `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WORKSPHERE_LOGO, ICON_SHIELD } from '../auth-icons';

@Component({
  selector: 'ws-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
  readonly logo   = WORKSPHERE_LOGO;
  readonly shield = ICON_SHIELD;
}
`);

write(`${WEB}/features/auth/auth-layout/auth-layout.component.html`, `
<!-- WorkSphere logo above the card -->
<div class="auth-logo">
  <div class="auth-logo__icon" [innerHTML]="logo"></div>
  <span class="auth-logo__name">Work<span>Sphere</span></span>
</div>

<!-- Card content projected from parent route -->
<ng-content />

<!-- Footer -->
<footer class="auth-footer">
  <div class="auth-footer__links">
    <a routerLink="/privacy">Privacy Policy</a>
    <span>·</span>
    <a routerLink="/terms">Terms of Service</a>
    <span>·</span>
    <a routerLink="/support">Support</a>
  </div>
  <div class="auth-footer__copy">
    <span [innerHTML]="shield"></span>
    SOC 2 · TLS 1.3 encrypted · © 2026 WorkSphere. All rights reserved.
  </div>
</footer>
`);

write(`${WEB}/features/auth/auth-layout/auth-layout.component.scss`, `
@use '../auth-shared' as *;

:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
`);

// ─────────────────────────────────────────────────────────────────
// LOGIN COMPONENT
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/features/auth/login/login.component.ts`, `
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
`);

write(`${WEB}/features/auth/login/login.component.html`, `
<ws-auth-layout>
  <div class="auth-card">

    <!-- Header -->
    <div class="auth-header">
      <h1 class="auth-header__title">Welcome back</h1>
      <p class="auth-header__subtitle">Sign in to your account to access your workspace</p>
    </div>

    <!-- Error alert -->
    @if (errorMessage()) {
      <div class="auth-alert" role="alert">{{ errorMessage() }}</div>
    }

    <!-- Form -->
    <form (ngSubmit)="onSubmit()" novalidate>

      <!-- Email -->
      <div class="auth-field">
        <label class="auth-field__label" for="email">Email</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon" [innerHTML]="iconMail"></span>
          <input
            id="email"
            class="auth-field__input"
            type="email"
            placeholder="name@company.com"
            [(ngModel)]="email"
            name="email"
            autocomplete="email"
            required />
        </div>
      </div>

      <!-- Password -->
      <div class="auth-field">
        <label class="auth-field__label" for="password">Password</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon" [innerHTML]="iconLock"></span>
          <input
            id="password"
            class="auth-field__input auth-field__input--with-action"
            [type]="showPassword() ? 'text' : 'password'"
            placeholder="Enter your password"
            [(ngModel)]="password"
            name="password"
            autocomplete="current-password"
            required />
          <button
            type="button"
            class="auth-field__action"
            (click)="togglePassword()"
            [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
            <span [innerHTML]="showPassword() ? iconEyeOff : iconEye"></span>
          </button>
        </div>
      </div>

      <!-- Remember me + Forgot password -->
      <div class="auth-row login-options">
        <label class="auth-checkbox">
          <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
          <span class="auth-checkbox__label">Remember me</span>
        </label>
        <a routerLink="/auth/forgot-password" class="auth-link">Forgot password?</a>
      </div>

      <!-- Submit -->
      <button type="submit" class="auth-btn" [disabled]="isLoading()">
        @if (isLoading()) {
          <span class="auth-btn__spinner"></span>
        } @else {
          Sign in →
        }
      </button>

    </form>

    <!-- Divider -->
    <div class="auth-divider">
      <span class="auth-divider__line"></span>
      <span class="auth-divider__text">Or continue with</span>
      <span class="auth-divider__line"></span>
    </div>

    <!-- SSO buttons -->
    <div class="auth-sso">
      <button type="button" class="auth-sso__btn" (click)="null">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Google
      </button>
      <button type="button" class="auth-sso__btn" (click)="null">
        <svg width="18" height="18" viewBox="0 0 21 21">
          <path fill="#F25022" d="M0 0h10v10H0z"/>
          <path fill="#7FBA00" d="M11 0h10v10H11z"/>
          <path fill="#00A4EF" d="M0 11h10v10H0z"/>
          <path fill="#FFB900" d="M11 11h10v10H11z"/>
        </svg>
        Microsoft
      </button>
    </div>

    <!-- Bottom links -->
    <p class="auth-bottom">
      Don't have an account?
      <a routerLink="/auth/register" class="auth-link auth-link--bold"> Sign up</a>
    </p>
    <p class="auth-bottom">
      <a routerLink="/auth/sso" class="auth-link auth-link--brand">Use single sign-on (SSO)</a>
    </p>

  </div>
</ws-auth-layout>
`);

write(`${WEB}/features/auth/login/login.component.scss`, `
@use '../auth-shared' as *;

:host {
  display: contents;
}

// Page background wraps the layout
.login-options {
  margin-bottom: 20px;
}
`);

// ─────────────────────────────────────────────────────────────────
// FORGOT PASSWORD COMPONENT
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/features/auth/forgot-password/forgot-password.component.ts`, `
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
      .post(\`\${environment.apiUrls.identity}/api/v1/auth/forgot-password\`, {
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
`);

write(`${WEB}/features/auth/forgot-password/forgot-password.component.html`, `
<ws-auth-layout>
  <div class="auth-card">

    @if (!isSuccess()) {
      <!-- Back link -->
      <a routerLink="/auth/login" class="auth-back">
        <span [innerHTML]="iconArrowLeft"></span>
        Back to sign in
      </a>

      <!-- Header -->
      <div class="auth-header">
        <h1 class="auth-header__title">Reset your password</h1>
        <p class="auth-header__subtitle">
          Enter the email tied to your WorkSphere account and we'll send a secure reset link.
        </p>
      </div>

      <!-- Error alert -->
      @if (errorMessage()) {
        <div class="auth-alert" role="alert">{{ errorMessage() }}</div>
      }

      <!-- Form -->
      <form (ngSubmit)="onSubmit()" novalidate>

        <!-- Work email -->
        <div class="auth-field">
          <label class="auth-field__label" for="reset-email">Work email</label>
          <div class="auth-field__input-wrap">
            <span class="auth-field__icon" [innerHTML]="iconMail"></span>
            <input
              id="reset-email"
              class="auth-field__input"
              type="email"
              placeholder="name@company.com"
              [(ngModel)]="email"
              name="email"
              autocomplete="email"
              required />
          </div>
        </div>

        <!-- Submit -->
        <button type="submit" class="auth-btn" [disabled]="isLoading()">
          @if (isLoading()) {
            <span class="auth-btn__spinner"></span>
          } @else {
            Send reset link →
          }
        </button>

      </form>

      <!-- Security info box -->
      <div class="auth-info-box">
        <span class="auth-info-box__icon" [innerHTML]="iconInfo"></span>
        <p class="auth-info-box__text">
          For your security, the reset link expires in 15 minutes. After 5 failed
          sign-in attempts your account is temporarily locked — contact your workspace
          admin to unlock.
        </p>
      </div>

      <!-- Bottom link -->
      <p class="auth-bottom">
        Remember it now?
        <a routerLink="/auth/login" class="auth-link auth-link--bold"> Sign in</a>
      </p>

    } @else {
      <!-- Success state -->
      <div class="auth-success">
        <div class="auth-success__icon" [innerHTML]="iconCheck"></div>
        <h2 class="auth-success__title">Check your inbox</h2>
        <p class="auth-success__text">
          We've sent a reset link to <strong>{{ email }}</strong>.<br />
          It expires in 15 minutes.
        </p>
      </div>
      <p class="auth-bottom" style="margin-top: 28px;">
        <a routerLink="/auth/login" class="auth-link auth-link--bold">← Back to sign in</a>
      </p>
    }

  </div>
</ws-auth-layout>
`);

write(`${WEB}/features/auth/forgot-password/forgot-password.component.scss`, `
@use '../auth-shared' as *;

:host {
  display: contents;
}
`);

// ─────────────────────────────────────────────────────────────────
// REGISTER COMPONENT
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/features/auth/register/register.component.ts`, `
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
`);

write(`${WEB}/features/auth/register/register.component.html`, `
<ws-auth-layout>
  <div class="auth-card">

    <!-- Header -->
    <div class="auth-header">
      <h1 class="auth-header__title">Create your workspace</h1>
      <p class="auth-header__subtitle">
        Start your 14-day WorkSphere trial — no credit card required.
      </p>
    </div>

    <!-- SSO buttons (shown first, matching design) -->
    <div class="auth-sso">
      <button type="button" class="auth-sso__btn" (click)="null">
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Google
      </button>
      <button type="button" class="auth-sso__btn" (click)="null">
        <svg width="18" height="18" viewBox="0 0 21 21">
          <path fill="#F25022" d="M0 0h10v10H0z"/>
          <path fill="#7FBA00" d="M11 0h10v10H11z"/>
          <path fill="#00A4EF" d="M0 11h10v10H0z"/>
          <path fill="#FFB900" d="M11 11h10v10H11z"/>
        </svg>
        Microsoft
      </button>
    </div>

    <!-- Divider -->
    <div class="auth-divider">
      <span class="auth-divider__line"></span>
      <span class="auth-divider__text">Or sign up with email</span>
      <span class="auth-divider__line"></span>
    </div>

    <!-- Error alert -->
    @if (errorMessage()) {
      <div class="auth-alert" role="alert">{{ errorMessage() }}</div>
    }

    <!-- Form -->
    <form (ngSubmit)="onSubmit()" novalidate>

      <!-- Full name + Company (two columns) -->
      <div class="auth-row auth-row--two-col">
        <div class="auth-field">
          <label class="auth-field__label" for="fullName">Full name</label>
          <div class="auth-field__input-wrap">
            <input
              id="fullName"
              class="auth-field__input auth-field__input--no-icon"
              type="text"
              placeholder="Maya Iqbal"
              [(ngModel)]="fullName"
              name="fullName"
              autocomplete="name"
              required />
          </div>
        </div>
        <div class="auth-field">
          <label class="auth-field__label" for="companyName">Company</label>
          <div class="auth-field__input-wrap">
            <input
              id="companyName"
              class="auth-field__input auth-field__input--no-icon"
              type="text"
              placeholder="Northwind Ltd."
              [(ngModel)]="companyName"
              name="companyName"
              autocomplete="organization"
              required />
          </div>
        </div>
      </div>

      <!-- Work email -->
      <div class="auth-field">
        <label class="auth-field__label" for="reg-email">Work email</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon" [innerHTML]="iconMail"></span>
          <input
            id="reg-email"
            class="auth-field__input"
            type="email"
            placeholder="name@company.com"
            [(ngModel)]="email"
            name="email"
            autocomplete="email"
            required />
        </div>
      </div>

      <!-- Password -->
      <div class="auth-field">
        <label class="auth-field__label" for="reg-password">Password</label>
        <div class="auth-field__input-wrap">
          <span class="auth-field__icon" [innerHTML]="iconLock"></span>
          <input
            id="reg-password"
            class="auth-field__input auth-field__input--with-action"
            [type]="showPassword() ? 'text' : 'password'"
            placeholder="Create a strong password"
            [(ngModel)]="password"
            name="password"
            autocomplete="new-password"
            required />
          <button
            type="button"
            class="auth-field__action"
            (click)="togglePassword()"
            [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
            <span [innerHTML]="showPassword() ? iconEyeOff : iconEye"></span>
          </button>
        </div>
      </div>

      <!-- Terms checkbox -->
      <div class="register-terms">
        <label class="auth-checkbox">
          <input type="checkbox" [(ngModel)]="agreeTerms" name="agreeTerms" />
          <span class="auth-checkbox__label">
            I agree to WorkSphere's
            <a routerLink="/terms" class="auth-link auth-link--brand">Terms of Service</a>
            and
            <a routerLink="/privacy" class="auth-link auth-link--brand">Privacy Policy</a>
          </span>
        </label>
      </div>

      <!-- Submit -->
      <button type="submit" class="auth-btn" [disabled]="isLoading()">
        @if (isLoading()) {
          <span class="auth-btn__spinner"></span>
        } @else {
          Create account →
        }
      </button>

    </form>

    <!-- Bottom link -->
    <p class="auth-bottom">
      Already have an account?
      <a routerLink="/auth/login" class="auth-link auth-link--bold"> Sign in</a>
    </p>

  </div>
</ws-auth-layout>
`);

write(`${WEB}/features/auth/register/register.component.scss`, `
@use '../auth-shared' as *;

:host {
  display: contents;
}

.register-terms {
  margin-bottom: 20px;

  .auth-checkbox__label {
    font-size: 13px;
    line-height: 1.5;
  }
}
`);

// ─────────────────────────────────────────────────────────────────
// UPDATE AUTH ROUTES to add forgot-password
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/features/auth/auth.routes.ts`, `
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
`);

// ─────────────────────────────────────────────────────────────────
// UPDATE GLOBAL STYLES — add auth-page wrapper + Inter font
// ─────────────────────────────────────────────────────────────────
const stylesPath = `C:\\Projects\\WorkSphere_frontend\\web\\src\\styles.scss`;
const existingStyles = fs.readFileSync(stylesPath, 'utf8');
if (!existingStyles.includes('auth-page')) {
  // Already has Inter import and variables — just append the auth-page rule
  const extra = `
// ─── Auth page background ─────────────────────────────────────────
// Applied to the <body> or host element of auth route components
// The .auth-page class is defined in auth-shared.scss but needs to be
// accessible globally so the app-root background changes correctly
body.auth-route {
  background-color: #F4F6F8;
}
`;
  fs.writeFileSync(stylesPath, existingStyles + extra, 'utf8');
  console.log('✓ Updated styles.scss');
}

// ─────────────────────────────────────────────────────────────────
// UPDATE APP ROUTES — add auth-page wrapper to auth routes
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/app.routes.ts`, `
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    // Auth pages have their own layout (no sidebar)
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent),
      },
      {
        path: 'employees',
        loadChildren: () =>
          import('./features/employees/employees.routes')
            .then(m => m.EMPLOYEE_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
`);

// ─────────────────────────────────────────────────────────────────
// UPDATE app.component.ts — set auth-route class on body
// ─────────────────────────────────────────────────────────────────
write(`${WEB}/app.component.ts`, `
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [RouterOutlet],
  template:   '<router-outlet />',
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const isAuth = e.urlAfterRedirects.startsWith('/auth');
        document.body.classList.toggle('auth-route', isAuth);
      });
  }
}
`);

console.log([
  '',
  '✅ Auth pages created!',
  '',
  'Files created:',
  '  features/auth/_auth-shared.scss',
  '  features/auth/auth-icons.ts',
  '  features/auth/auth-layout/ (3 files)',
  '  features/auth/login/ (3 files)',
  '  features/auth/forgot-password/ (3 files)',
  '  features/auth/register/ (3 files)',
  '  features/auth/auth.routes.ts (updated)',
  '',
  'Next: cd web && ng build',
].join('\n'));
