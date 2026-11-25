import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { MenuService } from '../menu/menu.service';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

/** /login is for guests. A logged-in user is sent to their home page (05 §3.2). */
export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const loggedIn = inject(TokenStorageService).hasValidToken() && inject(AuthService).isLoggedIn();
  if (!loggedIn) {
    return true;
  }
  const home = inject(MenuService).homeRoute();
  // An empty menu falls back to /login; allow it instead of redirecting to itself.
  return home === '/login' ? true : inject(Router).parseUrl(home);
};
