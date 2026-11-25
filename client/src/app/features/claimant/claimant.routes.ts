import { Routes } from '@angular/router';

/** Claimant routes (05 §1 screens 3 to 5). Paths match menus.route for MY_CLAIMS and NEW_CLAIM. */
export const CLAIMANT_ROUTES: Routes = [
  {
    path: 'claims',
    title: 'My claims',
    loadComponent: () => import('./my-claims/my-claims.page').then((m) => m.MyClaimsPage),
  },
  {
    path: 'claims/new',
    title: 'New claim',
    loadComponent: () => import('./new-claim/new-claim.page').then((m) => m.NewClaimPage),
  },
  {
    path: 'claims/:id',
    title: 'Claim',
    loadComponent: () =>
      import('./claimant-claim-detail/claimant-claim-detail.page').then((m) => m.ClaimantClaimDetailPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'claims' },
];
