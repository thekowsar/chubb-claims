import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

/**
 * Logged in with an unexpired token (05 §3.2). Otherwise clears the session and goes to
 * /login?returnUrl=... Works as canActivate and canMatch.
 */
export const authGuard: CanActivateFn & CanMatchFn = (): boolean | UrlTree => {
  const storage = inject(TokenStorageService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (storage.hasValidToken() && auth.isLoggedIn()) {
    return true;
  }
  auth.logout();
  const returnUrl = router.getCurrentNavigation()?.extractedUrl.toString();
  const queryParams = returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/login') ? { returnUrl } : {};
  return router.createUrlTree(['/login'], { queryParams });
};
