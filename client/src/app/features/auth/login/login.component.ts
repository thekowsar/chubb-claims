import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { isAllowedReturnUrl } from '../../../core/auth/role.guard';
import { AppError, isServerOrNetworkError } from '../../../core/http/app-error';
import { MenuService } from '../../../core/menu/menu.service';

/** Login page (05 §2.1, §5.1). */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>chubb-claims</mat-card-title>
          <mat-card-subtitle>Log in to continue</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="outline" class="field">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" autocomplete="username" data-testid="username" />
              @if (form.controls.username.hasError('required')) {
                <mat-error>Username is required</mat-error>
              }
              @if (form.controls.username.hasError('maxlength')) {
                <mat-error>Username is at most 50 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="field">
              <mat-label>Password</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="current-password"
                data-testid="password"
              />
              @if (form.controls.password.hasError('required')) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.controls.password.hasError('maxlength')) {
                <mat-error>Password is at most 100 characters</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <p class="error" role="alert" data-testid="login-error">{{ errorMessage() }}</p>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              class="submit"
              data-testid="submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Log in
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
    .card { width: 360px; padding: var(--space-3); }
    .field { width: 100%; }
    .submit { width: 100%; height: 40px; display: flex; justify-content: center; }
    .error { color: var(--status-rejected); margin: 0 0 var(--space-3); }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly menu = inject(MenuService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.maxLength(100)]],
  });
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.form.disable();

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target = isAllowedReturnUrl(returnUrl, user.role) ? returnUrl : this.menu.homeRoute();
        void this.router.navigateByUrl(target);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.form.enable();
        const invalid = err instanceof AppError && err.code === 'INVALID_CREDENTIALS';
        // 0 / 5xx: the error interceptor already showed one popup with the reference id; Log in is the retry.
        const ownText = invalid ? 'Invalid username or password' : isServerOrNetworkError(err) ? null : 'Login failed. Please try again.';
        this.errorMessage.set(ownText);
        if (invalid) {
          this.form.controls.password.reset('');
        }
      },
    });
  }
}
