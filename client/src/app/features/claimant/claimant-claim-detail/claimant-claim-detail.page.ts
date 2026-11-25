import { Component, computed, input } from '@angular/core';
import { ClaimDetailComponent } from '../../../shared/claims/claim-detail/claim-detail.component';

/** Screen 5: claim detail for the claimant. No action panel; messages while IN_PROGRESS. */
@Component({
  selector: 'app-claimant-claim-detail-page',
  standalone: true,
  imports: [ClaimDetailComponent],
  template: `<app-claim-detail [claimId]="claimId()" mode="claimant" backLink="/claimant/claims" />`,
})
export class ClaimantClaimDetailPage {
  /** Route param, bound by withComponentInputBinding. */
  readonly id = input.required<string>();
  readonly claimId = computed(() => Number(this.id()));
}
