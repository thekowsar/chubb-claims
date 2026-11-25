import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClaimDetail } from '../../../core/models/claim.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { ClaimService } from '../../../shared/claims/claim.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { decimalPlaces } from '../../../shared/validators/decimal-places.validator';
import { maxAmount } from '../../../shared/validators/max-amount.validator';
import { notBlank } from '../../../shared/validators/not-blank.validator';
import { DecisionResult, classifyDecisionError } from '../decision-result';

export interface SettleDialogData {
  claim: ClaimDetail;
}

/**
 * Settle dialog (05 §2.5, §6): settled amount (> 0, ≤ assessed, 2 dp) and a decision note.
 * Sends POST /settle itself: 400 shows inline, 409 closes with `conflict`, 5xx / network leave it open (popup only).
 */
@Component({
  selector: 'app-settle-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Settle {{ data.claim.claimNumber }}</h2>
    <form [formGroup]="form" (ngSubmit)="confirm()" novalidate>
      <mat-dialog-content>
        <p class="hint">Assessed amount: {{ data.claim.assessedAmount | money: data.claim.currency }}</p>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Settled amount ({{ data.claim.currency }})</mat-label>
          <input matInput type="number" min="0.01" step="0.01" formControlName="settledAmount" data-testid="settledAmount" cdkFocusInitial />
          @if (form.controls.settledAmount.hasError('required')) {
            <mat-error>Settled amount is required</mat-error>
          }
          @if (form.controls.settledAmount.hasError('min')) {
            <mat-error>Must be greater than 0</mat-error>
          }
          @if (form.controls.settledAmount.hasError('maxAmount')) {
            <mat-error data-testid="max-error">Can't be more than the assessed amount</mat-error>
          }
          @if (form.controls.settledAmount.hasError('decimalPlaces')) {
            <mat-error>At most 2 decimal places</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Decision note</mat-label>
          <textarea matInput rows="4" maxlength="2000" formControlName="decisionNote" data-testid="decisionNote"></textarea>
          @if (form.controls.decisionNote.hasError('required') || form.controls.decisionNote.hasError('blank')) {
            <mat-error>A decision note is required</mat-error>
          }
        </mat-form-field>
        @if (error()) {
          <p class="error" role="alert" data-testid="dialog-error">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close data-testid="cancel">Cancel</button>
        <button mat-flat-button color="primary" type="submit" data-testid="confirm" [disabled]="form.invalid || saving()">
          @if (saving()) {
            <mat-spinner diameter="20" />
          } @else {
            Settle
          }
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .full { width: 100%; }
    .hint { color: #666; margin-top: 0; }
    .error { color: var(--status-rejected); }
    mat-dialog-content { min-width: 360px; }
  `,
})
export class SettleDialogComponent {
  readonly data = inject<SettleDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<SettleDialogComponent, DecisionResult>>(MatDialogRef);
  private readonly claims = inject(ClaimService);
  private readonly notify = inject(NotifyService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).group({
    settledAmount: [
      this.data.claim.assessedAmount as number | null,
      [Validators.required, Validators.min(0.01), decimalPlaces(2), maxAmount(this.data.claim.assessedAmount)],
    ],
    decisionNote: ['', [Validators.required, Validators.maxLength(2000), notBlank]],
  });

  confirm(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { settledAmount: Number(v.settledAmount), decisionNote: (v.decisionNote ?? '').trim() };
    this.saving.set(true);
    this.error.set(null);
    this.claims.settle(this.data.claim.id, body).subscribe({
      next: (claim) => {
        this.saving.set(false);
        this.ref.close({ claim });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const failure = classifyDecisionError(err);
        if (failure.kind === 'inline') {
          this.error.set(failure.message);
        } else if (failure.kind === 'conflict') {
          this.notify.error('This claim was changed. Reloaded.');
          this.ref.close('conflict');
        } else if (failure.kind === 'close') {
          this.ref.close();
        }
      },
    });
  }
}
