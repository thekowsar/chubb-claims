import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MenuService } from '../menu/menu.service';
import { NotifyService } from '../notify/notify.service';
import { CORRELATION_HEADER } from './auth.interceptor';

const LOGIN_URL = '/api/auth/login';

/** Errors of one kind closer together than this count as one burst: one popup (and, for 403, one redirect). */
export const FORBIDDEN_DEDUPE_MS = 2000;
export const BURST_WINDOW_MS = FORBIDDEN_DEDUPE_MS;

/** Remembers when a popup of one kind was last shown, so parallel or back-to-back failures show one popup. */
abstract class BurstNotice {
  private lastShownAt = Number.NEGATIVE_INFINITY;

  /** True the first time in a burst; false for the rest of it. */
  shouldShow(now: number = Date.now()): boolean {
    if (now - this.lastShownAt < BURST_WINDOW_MS) {
      return false;
    }
    this.lastShownAt = now;
    return true;
  }
}

/** Burst gate for 403 access denied. */
@Injectable({ providedIn: 'root' })
export class ForbiddenNotice extends BurstNotice {}

/** Burst gate for 0 (network) and 5xx server errors. */
@Injectable({ providedIn: 'root' })
export class ServerErrorNotice extends BurstNotice {}

/**
 * App-wide reactions (05 §5.3): 401 (not login) logs out and goes to /login?returnUrl;
 * 403 shows a snackbar and goes home, once per burst (ForbiddenNotice); 0 / 5xx show one snackbar with the
 * correlation id per burst (ServerErrorNotice). Components must not show their own text for these (see isHandledGlobally).
 * 400, 404 and 409 pass through untouched for the caller to show inline. The error is always rethrown.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotifyService);
  const menu = inject(MenuService);
  const forbidden = inject(ForbiddenNotice);
  const serverError = inject(ServerErrorNotice);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || !req.url.startsWith('/api/')) {
        return throwError(() => err);
      }
      if (err.status === 401 && !req.url.startsWith(LOGIN_URL)) {
        auth.logout();
        const current = router.url;
        const queryParams = current && current !== '/' && !current.startsWith('/login') ? { returnUrl: current } : {};
        notify.error('Your session has expired. Please log in again.');
        void router.navigate(['/login'], { queryParams });
      } else if (err.status === 403) {
        if (forbidden.shouldShow()) {
          notify.error("You don't have access to that.");
          void router.navigateByUrl(menu.homeRoute());
        }
      } else if ((err.status === 0 || err.status >= 500) && serverError.shouldShow()) {
        const ref = err.headers?.get(CORRELATION_HEADER) ?? req.headers.get(CORRELATION_HEADER);
        notify.error(`Something went wrong. Please try again.${ref ? ' Reference: ' + ref : ''}`);
      }
      return throwError(() => err);
    }),
  );
};
