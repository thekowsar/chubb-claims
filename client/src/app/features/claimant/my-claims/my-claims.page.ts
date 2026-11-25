import { Component } from '@angular/core';
import { ClaimListComponent } from '../../../shared/claims/claim-list/claim-list.component';

/** Screen 3: the claimant's own claims (05 §1). The API scopes the list to the caller. */
@Component({
  selector: 'app-my-claims-page',
  standalone: true,
  imports: [ClaimListComponent],
  template: `<app-claim-list mode="claimant" title="My claims" />`,
})
export class MyClaimsPage {}
