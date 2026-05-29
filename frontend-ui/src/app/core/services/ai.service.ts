import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { AiChatRequest, AiChatResponse } from '../models/ai.models';
import { ApiResponse } from '../models/duty-log.models';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly endpoint = '/api/ai/chat';

  constructor(private readonly http: HttpClient) {}

  sendMessage(payload: AiChatRequest) {
    return this.http.post<ApiResponse<AiChatResponse> | AiChatResponse>(this.endpoint, payload).pipe(
      map((response) => {
        if ('success' in response) {
          return response.data?.response ?? '';
        }
        return response.response;
      }),
      catchError((error) => {
        const message =
          typeof error === 'object' && error && 'error' in error
            ? (error as { error?: { message?: string } }).error?.message ??
              'AI service request failed'
            : 'AI service request failed';
        return throwError(() => new Error(message));
      })
    );
  }
}
