import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-cockpit-950">
      <div class="panel w-full max-w-md p-6">
        <h1 class="mb-4 text-xl font-semibold text-slate-100">Create Crew Account</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs text-slate-300">Name</label>
            <input type="text" formControlName="name" class="input-control" placeholder="Captain Name" />
          </div>
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
            <input type="password" formControlName="password" class="input-control" placeholder="••••••••" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-300">Role</label>
            <select formControlName="role" class="input-control">
              <option value="Pilot">Pilot</option>
              <option value="Crew">Crew</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <p *ngIf="message" class="text-sm text-emerald-400">{{ message }}</p>
          <p *ngIf="error" class="text-sm text-rose-400">{{ error }}</p>

          <button
            type="submit"
            class="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium hover:bg-cyan-500"
          >
            Register
          </button>
        </form>

        <p class="mt-4 text-sm text-slate-300">
          Already have an account?
          <a routerLink="/login" class="text-cyan-300 hover:text-cyan-200">Sign in</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  error = '';
  message = '';

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['Pilot', [Validators.required]]
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
    this.message = '';
    const { name, email, password, role } = this.form.getRawValue();

    this.auth
      .register({
        name,
        email,
        passwordHash: password,
        role
      })
      .subscribe({
        next: (response) => {
          this.message = response.message || 'Registration successful. Redirecting to login...';
          setTimeout(() => this.router.navigate(['/login']), 900);
        },
        error: (err: HttpErrorResponse) => {
          const apiMessage =
            typeof err.error === 'string'
              ? err.error
              : (err.error?.message as string | undefined);
          this.error =
            apiMessage ||
            `Registration failed (${err.status || 0}). Check backend and database connectivity.`;
        }
      });
  }
}

