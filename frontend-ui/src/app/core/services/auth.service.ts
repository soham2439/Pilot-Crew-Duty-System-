import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { ApiResponse } from '../models/duty-log.models';

export interface LoginPayload {
  email: string;
  passwordHash: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}

interface AuthTokenResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'pilot_duty_token';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginPayload) {
    return this.http.post<AuthTokenResponse>('/api/auth/login', payload).pipe(
      tap((res) => localStorage.setItem(this.tokenKey, res.token))
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post<ApiResponse<string>>('/api/auth/register', payload);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, string>;
      return (
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
        payload['role'] ??
        null
      );
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    return this.getRole() === 'Admin';
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }
}
