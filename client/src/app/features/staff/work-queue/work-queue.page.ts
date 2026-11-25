import { Component } from '@angular/core';
import { ClaimStatus } from '../../../core/models/claim.model';
import { ClaimListComponent } from '../../../shared/claims/claim-list/claim-list.component';

/** Screen 6: claims assigned to me. ASSIGNED and IN_PROGRESS by default (05 §1). */
@Component({
  selector: 'app-work-queue-page',
  standalone: true,
  imports: [ClaimListComponent],
  template: `<app-claim-list mode="staff" title="My work queue" [defaultStatuses]="defaultStatuses" />`,
})
export class WorkQueuePage {
  protected readonly defaultStatuses: ClaimStatus[] = ['ASSIGNED', 'IN_PROGRESS'];
}
