import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../auth/token-storage.service';

export const CORRELATION_HEADER = 'X-Correlation-Id';
const LOGIN_URL = '/api/auth/login';

/** Adds Authorization: Bearer (except on login) and a fresh X-Correlation-Id to every /api call (05 §5.3). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const setHeaders: Record<string, string> = {};
  if (!req.headers.has(CORRELATION_HEADER)) {
    setHeaders[CORRELATION_HEADER] = crypto.randomUUID();
  }
  if (!req.url.startsWith(LOGIN_URL)) {
    const token = inject(TokenStorageService).validToken();
    if (token) {
      setHeaders['Authorization'] = `Bearer ${token}`;
    }
  }
  return next(req.clone({ setHeaders }));
};
