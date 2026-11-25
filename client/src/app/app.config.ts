import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, inject } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { apiEnvelopeInterceptor } from './core/http/api-envelope.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

/** Restores the session from sessionStorage before the first navigation (05 §3.1). */
export function restoreSessionFactory(): () => Promise<unknown> {
  const auth = inject(AuthService);
  return () => firstValueFrom(auth.restoreSession());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    // Order matters: requests run auth -> envelope -> error, responses come back in reverse (05 §5.3).
    provideHttpClient(withInterceptors([authInterceptor, apiEnvelopeInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    { provide: APP_INITIALIZER, multi: true, useFactory: restoreSessionFactory },
  ],
};
