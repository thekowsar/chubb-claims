import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { isApiResponse } from '../models/api-response.model';
import { AppError, NETWORK_ERROR } from './app-error';
import { CORRELATION_HEADER } from './auth.interceptor';

/**
 * Success envelope: the body becomes `data`, so services get Observable<T>.
 * Any error becomes an AppError { status, code, message, details } (05 §5.3).
 */
export const apiEnvelopeInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  return next(req).pipe(
    map((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse && isApiResponse(event.body) && event.body.success) {
        return event.clone({ body: event.body.data });
      }
      return event;
    }),
    catchError((err: unknown) => throwError(() => toAppError(err))),
  );
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof HttpErrorResponse) {
    const correlationId = err.headers?.get(CORRELATION_HEADER) ?? null;
    if (err.status === 0) {
      return new AppError(0, NETWORK_ERROR, 'Cannot reach the server. Check your connection.', [], correlationId);
    }
    if (isApiResponse(err.error) && err.error.error) {
      const { code, message, details } = err.error.error;
      return new AppError(err.status, code, message, details ?? [], correlationId);
    }
    return new AppError(err.status, 'INTERNAL_ERROR', 'An unexpected error occurred', [], correlationId);
  }
  return new AppError(-1, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
