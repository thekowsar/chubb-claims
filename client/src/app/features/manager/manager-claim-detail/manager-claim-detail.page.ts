import { Component, computed, inject, input, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ClaimDetail } from '../../../core/models/claim.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { ClaimDetailComponent } from '../../../shared/claims/claim-detail/claim-detail.component';
import {
  AssignDialogComponent,
  AssignDialogData,
  AssignDialogResult,
} from '../assign-dialog/assign-dialog.component';

/** Screen 10: read-only claim detail and messages for the manager, plus Assign / Reassign (05 §1). */
@Component({
  selector: 'app-manager-claim-detail-page',
  standalone: true,
  imports: [ClaimDetailComponent, MatButtonModule],
  template: `
    <app-claim-detail #detail [claimId]="claimId()" mode="manager" backLink="/manager/claims">
      <div actions>
        @if (detail.claim(); as c) {
          @if (c.status === 'SUBMITTED' || c.status === 'ASSIGNED') {
            <button mat-flat-button color="primary" type="button" data-testid="assign" (click)="openAssign(c)">
              {{ c.assignedStaff ? 'Reassign…' : 'Assign…' }}
            </button>
          } @else {
            <p class="hint" data-testid="no-actions">Assignment is closed once work has started.</p>
          }
        }
      </div>
    </app-claim-detail>
  `,
  styles: `.hint { color: #666; font-size: 13px; }`,
})
export class ManagerClaimDetailPage {
  readonly id = input.required<string>();
  readonly claimId = computed(() => Number(this.id()));

  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);
  private readonly detail = viewChild.required(ClaimDetailComponent);

  openAssign(claim: ClaimDetail): void {
    this.dialog
      .open<AssignDialogComponent, AssignDialogData, AssignDialogResult>(AssignDialogComponent, { data: { claim } })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }
        if (result !== 'conflict') {
          this.notify.success(`${result.claim.claimNumber} assigned to ${result.claim.assignedStaff?.displayName ?? 'staff'}`);
        }
        this.detail().reload();
      });
  }
}
