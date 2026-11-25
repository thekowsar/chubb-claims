import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { AppError } from '../../../core/http/app-error';
import { ClaimDetail } from '../../../core/models/claim.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { ClaimService } from '../../../shared/claims/claim.service';
import { decimalPlaces } from '../../../shared/validators/decimal-places.validator';
import { DecisionResult } from '../decision-result';
import { RejectDialogComponent, RejectDialogData } from '../reject-dialog/reject-dialog.component';
import { SettleDialogComponent, SettleDialogData } from '../settle-dialog/settle-dialog.component';

const CONFLICT_CODES = ['INVALID_STATUS_TRANSITION', 'CONCURRENT_MODIFICATION'];

/**
 * Staff action panel (05 §2.5): ASSIGNED shows Start work; IN_PROGRESS shows Assess, Settle and Reject.
 * Emits `changed` after every action and after a 409, so the detail page reloads.
 */
@Component({
  selector: 'app-staff-actions',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDividerModule],
  template: `
    @if (claim(); as c) {
      @switch (c.status) {
        @case ('ASSIGNED') {
          <p class="hint">Start work to message the claimant and assess the claim.</p>
          <button mat-flat-button color="primary" type="button" data-testid="start" [disabled]="busy()" (click)="start(c)">
            Start work
          </button>
        }
        @case ('IN_PROGRESS') {
          <form class="assess" [formGroup]="assessForm" (ngSubmit)="assess(c)" novalidate>
            <mat-form-field appearance="outline" class="field">
              <mat-label>Assessed amount ({{ c.currency }})</mat-label>
              <input matInput type="number" min="0" step="0.01" formControlName="assessedAmount" data-testid="assessedAmount" />
              @if (assessForm.controls.assessedAmount.hasError('required')) {
                <mat-error>Assessed amount is required</mat-error>
              }
              @if (assessForm.controls.assessedAmount.hasError('min')) {
                <mat-error>Can't be negative</mat-error>
              }
              @if (assessForm.controls.assessedAmount.hasError('decimalPlaces')) {
                <mat-error>At most 2 decimal places</mat-error>
              }
            </mat-form-field>
            <button mat-stroked-button type="submit" data-testid="save-assessment" [disabled]="assessForm.invalid || busy()">
              Save
            </button>
          </form>
          <mat-divider />
          <div class="decide">
            <button
              mat-flat-button
              color="primary"
              type="button"
              data-testid="settle"
              [disabled]="c.assessedAmount === null || busy()"
              (click)="openSettle(c)"
            >
              Settle…
            </button>
            <button mat-stroked-button color="warn" type="button" data-testid="reject" [disabled]="busy()" (click)="openReject(c)">
              Reject…
            </button>
          </div>
          @if (c.assessedAmount === null) {
            <p class="hint" data-testid="settle-hint">Save an assessed amount first.</p>
          }
        }
        @default {
          <p class="hint" data-testid="no-actions">No actions for a {{ c.status === 'SUBMITTED' ? 'claim waiting for assignment' : 'closed claim' }}.</p>
        }
      }
    }
  `,
  styles: `
    .assess { display: flex; gap: var(--space-2); align-items: flex-start; }
    .field { flex: 1; }
    .decide { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
    .hint { color: #666; font-size: 13px; }
  `,
})
export class StaffActionsComponent {
  readonly claim = input<ClaimDetail | null>(null);
  readonly changed = output<void>();

  private readonly claims = inject(ClaimService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);
  readonly busy = signal(false);

  readonly assessForm = inject(FormBuilder).group({
    assessedAmount: [null as number | null, [Validators.required, Validators.min(0), decimalPlaces(2)]],
  });

  constructor() {
    // Show the stored assessed amount whenever a (re)loaded claim arrives.
    effect(() => {
      const c = this.claim();
      this.assessForm.reset({ assessedAmount: c?.assessedAmount ?? null }, { emitEvent: false });
    });
  }

  start(c: ClaimDetail): void {
    this.run(this.claims.start(c.id), 'Work started');
  }

  assess(c: ClaimDetail): void {
    if (this.assessForm.invalid) {
      return;
    }
    const amount = Number(this.assessForm.getRawValue().assessedAmount);
    this.run(this.claims.assess(c.id, { assessedAmount: amount }), 'Assessment saved');
  }

  /** The dialog sends POST /settle itself and shows 400 inline; here we only react to how it closed. */
  openSettle(c: ClaimDetail): void {
    this.dialog
      .open<SettleDialogComponent, SettleDialogData, DecisionResult>(SettleDialogComponent, { data: { claim: c } })
      .afterClosed()
      .subscribe((result) => this.afterDecision(result, `Claim ${c.claimNumber} settled`));
  }

  /** The dialog sends POST /reject itself and shows 400 inline; here we only react to how it closed. */
  openReject(c: ClaimDetail): void {
    this.dialog
      .open<RejectDialogComponent, RejectDialogData, DecisionResult>(RejectDialogComponent, { data: { claim: c } })
      .afterClosed()
      .subscribe((result) => this.afterDecision(result, `Claim ${c.claimNumber} rejected`));
  }

  /** Success: snackbar and reload. Conflict: the dialog already showed "changed, reloaded", so just reload. */
  private afterDecision(result: DecisionResult | undefined, successMessage: string): void {
    if (!result) {
      return; // cancelled, or closed after a 401 / 403 the interceptor already reported
    }
    if (result !== 'conflict') {
      this.notify.success(successMessage);
    }
    this.changed.emit();
  }

  private run(call: Observable<ClaimDetail>, successMessage: string): void {
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success(successMessage);
        this.changed.emit();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (err instanceof AppError && err.status === 409 && CONFLICT_CODES.includes(err.code)) {
          this.notify.error('This claim was changed. Reloaded.');
          this.changed.emit();
        } else if (err instanceof AppError && (err.status === 400 || err.status === 404)) {
          this.notify.error(err.details[0]?.message ?? err.message);
        }
        // 401, 403, 0 and 5xx are already shown by the error interceptor.
      },
    });
  }
}
