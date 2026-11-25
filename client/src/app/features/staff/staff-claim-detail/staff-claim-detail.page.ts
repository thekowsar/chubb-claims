import { Component, computed, input } from '@angular/core';
import { ClaimDetailComponent } from '../../../shared/claims/claim-detail/claim-detail.component';
import { StaffActionsComponent } from '../staff-actions/staff-actions.component';

/** Screen 7: claim detail for the assigned staff member, with the workflow action panel. */
@Component({
  selector: 'app-staff-claim-detail-page',
  standalone: true,
  imports: [ClaimDetailComponent, StaffActionsComponent],
  template: `
    <app-claim-detail #detail [claimId]="claimId()" mode="staff" backLink="/staff/queue">
      <app-staff-actions actions [claim]="detail.claim()" (changed)="detail.reload()" />
    </app-claim-detail>
  `,
})
export class StaffClaimDetailPage {
  readonly id = input.required<string>();
  readonly claimId = computed(() => Number(this.id()));
}
