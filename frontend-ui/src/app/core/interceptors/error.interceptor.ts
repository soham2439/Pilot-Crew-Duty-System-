import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message =
        error.error?.message ||
        error.error ||
        'Unexpected API error. Please check backend status and token.';
      return throwError(() => new Error(message));
    })
  );
