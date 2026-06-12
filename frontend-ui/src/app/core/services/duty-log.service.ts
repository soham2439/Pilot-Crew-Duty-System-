import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { ApiResponse, DutyLog, DutyLogPayload } from '../models/duty-log.models';

@Injectable({ providedIn: 'root' })
export class DutyLogService {
  private readonly endpoint = '/api/dutylogs';

  constructor(private readonly http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<DutyLog[]>>(this.endpoint).pipe(
      map((response) => response.data ?? []),
      catchError((error) => this.handleError(error, 'Failed to load duty logs'))
    );
  }

  getMyDuties() {
    return this.http.get<ApiResponse<DutyLog[]>>(`${this.endpoint}/my-duties`).pipe(
      map((response) => response.data ?? []),
      catchError((error) => this.handleError(error, 'Failed to load your duty roster'))
    );
  }

  getById(id: number) {
    return this.http.get<ApiResponse<DutyLog>>(`${this.endpoint}/${id}`).pipe(
      map((response) => response.data),
      catchError((error) => this.handleError(error, 'Failed to load duty log'))
    );
  }

  create(payload: DutyLogPayload) {
    return this.http.post<ApiResponse<DutyLog>>(this.endpoint, payload).pipe(
      map((response) => response.data),
      catchError((error) => this.handleError(error, 'Failed to create duty log'))
    );
  }

  update(id: number, payload: DutyLogPayload) {
    return this.http.put<ApiResponse<string>>(`${this.endpoint}/${id}`, payload).pipe(
      catchError((error) => this.handleError(error, 'Failed to update duty log'))
    );
  }

  delete(id: number) {
    return this.http.delete<ApiResponse<string>>(`${this.endpoint}/${id}`).pipe(
      catchError((error) => this.handleError(error, 'Failed to delete duty log'))
    );
  }

  getRegistry() {
    return this.http.get<ApiResponse<any[]>>('/api/registry').pipe(
      map((response) => response.data ?? []),
      catchError((error) => this.handleError(error, 'Failed to load registry log timeline'))
    );
  }

  private handleError(error: unknown, fallbackMessage: string) {
    const message =
      typeof error === 'object' && error && 'error' in error
        ? (error as { error?: { message?: string } }).error?.message ?? fallbackMessage
        : fallbackMessage;
    return throwError(() => new Error(message));
  }
}
