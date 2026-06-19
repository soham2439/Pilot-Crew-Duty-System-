import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950">
      <div class="panel w-full max-w-md p-6">
        <h1 class="mb-4 text-xl font-semibold text-slate-100">Pilot Crew Duty Login</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs text-slate-300">Email</label>
            <input
              type="email"
              formControlName="email"
              class="input-control"
              placeholder="captain@airline.com"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-300">Password</label>
            <input
              type="password"
              formControlName="password"
              class="input-control"
              placeholder="••••••••"
            />
          </div>

          <p *ngIf="error" class="text-sm text-rose-400">{{ error }}</p>

          <button
            type="submit"
            class="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium hover:bg-cyan-500"
          >
            Sign in
          </button>
        </form>
        <p class="mt-4 text-sm text-slate-300">
          Need an account?
          <a routerLink="/register" class="text-cyan-300 hover:text-cyan-200">Register</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  error = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.auth
      .login({
        email,
        // backend expects field name "PasswordHash", we send the raw password here
        passwordHash: password
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err: HttpErrorResponse) => {
          const apiMessage =
            typeof err.error === 'string'
              ? err.error
              : (err.error?.message as string | undefined);
          this.error = apiMessage || 'Invalid credentials or backend unavailable.';
        }
      });
  }
}

