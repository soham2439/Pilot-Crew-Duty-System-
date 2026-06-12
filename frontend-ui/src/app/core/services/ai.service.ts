import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, BehaviorSubject, catchError, map, throwError } from 'rxjs';
import { AiChatRequest, AiChatResponse, AiChatResult } from '../models/ai.models';
import { ApiResponse } from '../models/duty-log.models';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly endpoint = '/api/ai/chat';

  private readonly highlightDutySubject = new Subject<number>();
  readonly highlightDuty$ = this.highlightDutySubject.asObservable();

  private readonly navigateTabSubject = new Subject<string>();
  readonly navigateTab$ = this.navigateTabSubject.asObservable();

  private readonly showDashboardSubject = new BehaviorSubject<boolean>(true);
  readonly showDashboard$ = this.showDashboardSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  triggerShowDashboard(show: boolean) {
    this.showDashboardSubject.next(show);
  }

  getShowDashboard(): boolean {
    return this.showDashboardSubject.value;
  }

  triggerHighlightDuty(dutyId: number) {
    this.highlightDutySubject.next(dutyId);
  }

  triggerNavigateTab(tab: string) {
    this.navigateTabSubject.next(tab);
  }

  sendMessage(payload: AiChatRequest) {
    return this.http.post<ApiResponse<AiChatResponse> | AiChatResponse>(this.endpoint, payload).pipe(
      map((response): AiChatResult => {
        if ('success' in response) {
          return {
            text: response.data?.response ?? '',
            dutiesChanged: response.data?.dutiesChanged ?? false,
            actions: response.data?.actions ?? []
          };
        }
        return {
          text: response.response,
          dutiesChanged: response.dutiesChanged ?? false,
          actions: response.actions ?? []
        };
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
