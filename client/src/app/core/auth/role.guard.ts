import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { MenuService } from '../menu/menu.service';
import { ROLE_PREFIX, RoleCode } from '../models/user.model';
import { AuthService } from './auth.service';

/**
 * Allows the route only for the given roles (05 §3.2). Otherwise redirects to the role's home page.
 * Used as canMatch, so another role's lazy bundle never loads. The API still enforces access.
 */
export function roleGuard(roles: RoleCode[]): CanActivateFn & CanMatchFn {
  return (): boolean | UrlTree => {
    const role = inject(AuthService).role();
    if (role && roles.includes(role)) {
      return true;
    }
    return inject(Router).parseUrl(inject(MenuService).homeRoute());
  };
}

/** Sends '' and unknown routes to the role's home page (or /login when logged out). */
export const homeRedirectGuard: CanActivateFn = (): UrlTree => {
  const auth = inject(AuthService);
  const target = auth.isLoggedIn() ? inject(MenuService).homeRoute() : '/login';
  return inject(Router).parseUrl(target);
};

/** True when url is a same-app path inside the role's own prefix. Used for ?returnUrl after login. */
export function isAllowedReturnUrl(url: string | null | undefined, role: RoleCode | null): url is string {
  if (!url || !role || !url.startsWith('/') || url.startsWith('//')) {
    return false;
  }
  const prefix = ROLE_PREFIX[role];
  return url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?');
}
