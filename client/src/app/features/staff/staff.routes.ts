import { Routes } from '@angular/router';

/** Claims staff routes (05 §1 screens 6 and 7). `queue` matches menus.route for MY_QUEUE. */
export const STAFF_ROUTES: Routes = [
  {
    path: 'queue',
    title: 'My work queue',
    loadComponent: () => import('./work-queue/work-queue.page').then((m) => m.WorkQueuePage),
  },
  {
    path: 'claims/:id',
    title: 'Claim',
    loadComponent: () => import('./staff-claim-detail/staff-claim-detail.page').then((m) => m.StaffClaimDetailPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'queue' },
];
