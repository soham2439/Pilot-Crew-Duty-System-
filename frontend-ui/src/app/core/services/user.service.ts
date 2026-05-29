import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { ApiResponse, UserSummary } from '../models/duty-log.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly http: HttpClient) {}

  getPilots() {
    return this.http.get<ApiResponse<UserSummary[]>>('/api/users/pilots').pipe(
      map((response) => response.data ?? []),
      catchError((error) => {
        const message =
          typeof error === 'object' && error && 'error' in error
            ? (error as { error?: { message?: string } }).error?.message ?? 'Failed to load pilots'
            : 'Failed to load pilots';
        return throwError(() => new Error(message));
      })
    );
  }
}
