import { Component } from '@angular/core';
import { ClaimListComponent } from '../../../shared/claims/claim-list/claim-list.component';

/** Screen 9: every claim. `?status=SUBMITTED` gives the unassigned queue (05 §1). */
@Component({
  selector: 'app-all-claims-page',
  standalone: true,
  imports: [ClaimListComponent],
  template: `<app-claim-list mode="manager" title="All claims" />`,
})
export class AllClaimsPage {}
