import { Routes } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

/** Manager routes (05 §1 screens 8 to 10). Paths match menus.route for DASHBOARD and ALL_CLAIMS. */
export const MANAGER_ROUTES: Routes = [
  {
    path: 'dashboard',
    title: 'Dashboard',
    // Chart.js is registered here, not in app.config, so it stays in the manager's lazy bundle (05 §8).
    providers: [provideCharts(withDefaultRegisterables())],
    loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'claims',
    title: 'All claims',
    loadComponent: () => import('./all-claims/all-claims.page').then((m) => m.AllClaimsPage),
  },
  {
    path: 'claims/:id',
    title: 'Claim',
    loadComponent: () =>
      import('./manager-claim-detail/manager-claim-detail.page').then((m) => m.ManagerClaimDetailPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];
