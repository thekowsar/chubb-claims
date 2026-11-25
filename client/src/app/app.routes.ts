import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { homeRedirectGuard, roleGuard } from './core/auth/role.guard';
import { ShellComponent } from './core/layout/shell/shell.component';

/** Top-level routes plus one lazy route file per role prefix (05 §3.2). */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'claimant',
        canMatch: [authGuard, roleGuard(['CLAIMANT'])],
        loadChildren: () => import('./features/claimant/claimant.routes').then((m) => m.CLAIMANT_ROUTES),
      },
      {
        path: 'staff',
        canMatch: [authGuard, roleGuard(['CLAIMS_STAFF'])],
        loadChildren: () => import('./features/staff/staff.routes').then((m) => m.STAFF_ROUTES),
      },
      {
        path: 'manager',
        canMatch: [authGuard, roleGuard(['MANAGER'])],
        loadChildren: () => import('./features/manager/manager.routes').then((m) => m.MANAGER_ROUTES),
      },
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      // Screen 12: unknown route for a logged-in user (guests are sent to /login by authGuard above).
      { path: '**', loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage) },
    ],
  },
  { path: '**', canActivate: [homeRedirectGuard], children: [] },
];
