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
import { notBlank } from '../../../shared/validators/not-blank.validator';
import { DecisionResult, classifyDecisionError } from '../decision-result';

export interface RejectDialogData {
  claim: ClaimDetail;
}

/**
 * Reject dialog (05 §2.5, §6): a decision note is required.
 * Sends POST /reject itself: 400 shows inline, 409 closes with `conflict`, 5xx / network leave it open (popup only).
 */
@Component({
  selector: 'app-reject-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Reject {{ data.claim.claimNumber }}</h2>
    <form [formGroup]="form" (ngSubmit)="confirm()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Decision note</mat-label>
          <textarea matInput rows="4" maxlength="2000" formControlName="decisionNote" data-testid="decisionNote" cdkFocusInitial></textarea>
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
        <button mat-flat-button color="warn" type="submit" data-testid="confirm" [disabled]="form.invalid || saving()">
          @if (saving()) {
            <mat-spinner diameter="20" />
          } @else {
            Reject
          }
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .full { width: 100%; }
    .error { color: var(--status-rejected); }
    mat-dialog-content { min-width: 360px; }
  `,
})
export class RejectDialogComponent {
  readonly data = inject<RejectDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<RejectDialogComponent, DecisionResult>>(MatDialogRef);
  private readonly claims = inject(ClaimService);
  private readonly notify = inject(NotifyService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    decisionNote: ['', [Validators.required, Validators.maxLength(2000), notBlank]],
  });

  confirm(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.claims.reject(this.data.claim.id, { decisionNote: this.form.getRawValue().decisionNote.trim() }).subscribe({
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
