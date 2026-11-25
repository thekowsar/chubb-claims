import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AppError, isAccessError, isServerOrNetworkError } from '../../../core/http/app-error';
import { ClaimDetail } from '../../../core/models/claim.model';
import { User } from '../../../core/models/user.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { ClaimService } from '../../../shared/claims/claim.service';
import { UserService } from '../user.service';

export interface AssignDialogData {
  claim: ClaimDetail;
}

/** What the dialog closes with: the updated claim, or `conflict` when the claim changed underneath (409). */
export type AssignDialogResult = { claim: ClaimDetail } | 'conflict';

/** Assign / reassign dialog (05 §2.6). Calls PUT /assignment itself so INVALID_ASSIGNEE can show inline. */
@Component({
  selector: 'app-assign-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ data.claim.assignedStaff ? 'Reassign' : 'Assign' }} {{ data.claim.claimNumber }}</h2>
    <form [formGroup]="form" (ngSubmit)="assign()" novalidate>
      <mat-dialog-content>
        @if (loadingStaff()) {
          <p data-testid="staff-loading">Loading…</p>
        } @else if (staffFailed()) {
          <button mat-stroked-button type="button" data-testid="staff-retry" (click)="loadStaff()">Retry</button>
        } @else if (staff().length === 0) {
          <p data-testid="no-staff">No staff available.</p>
        } @else {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Staff member</mat-label>
            <mat-select formControlName="staffId" data-testid="staff-select">
              @for (s of staff(); track s.id) {
                <mat-option [value]="s.id">{{ s.displayName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        @if (error()) {
          <p class="error" role="alert" data-testid="assign-error">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close data-testid="cancel">Cancel</button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          data-testid="confirm"
          [disabled]="form.invalid || saving() || staff().length === 0"
        >
          @if (saving()) {
            <mat-spinner diameter="20" />
          } @else {
            Assign
          }
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .full { width: 100%; }
    .error { color: var(--status-rejected); }
    mat-dialog-content { min-width: 320px; }
  `,
})
export class AssignDialogComponent implements OnInit {
  readonly data = inject<AssignDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<AssignDialogComponent, AssignDialogResult>>(MatDialogRef);
  private readonly users = inject(UserService);
  private readonly claims = inject(ClaimService);
  private readonly notify = inject(NotifyService);

  readonly staff = signal<User[]>([]);
  readonly loadingStaff = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /** The staff list failed with 0 / 5xx: the interceptor showed the popup, the dialog offers Retry only. */
  readonly staffFailed = signal(false);

  readonly form = inject(FormBuilder).group({
    staffId: [this.data.claim.assignedStaff?.id ?? (null as number | null), Validators.required],
  });

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loadingStaff.set(true);
    this.staffFailed.set(false);
    this.error.set(null);
    this.users.listStaff().subscribe({
      next: (list) => {
        this.staff.set(list);
        this.loadingStaff.set(false);
      },
      error: (err: unknown) => {
        this.loadingStaff.set(false);
        if (isAccessError(err)) {
          this.ref.close(); // the interceptor showed the message and is navigating home
          return;
        }
        if (isServerOrNetworkError(err)) {
          this.staffFailed.set(true); // popup from the interceptor; Retry only here
          return;
        }
        this.error.set("Couldn't load the staff list.");
      },
    });
  }

  assign(): void {
    const staffId = this.form.getRawValue().staffId;
    if (this.form.invalid || staffId === null || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.claims.assign(this.data.claim.id, staffId).subscribe({
      next: (claim) => {
        this.saving.set(false);
        this.ref.close({ claim });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (isAccessError(err)) {
          this.ref.close(); // the interceptor showed the message and is navigating home
        } else if (isServerOrNetworkError(err)) {
          // The interceptor showed the popup; the Assign button stays as the retry.
        } else if (err instanceof AppError && err.status === 409) {
          this.notify.error('This claim was changed. Reloaded.');
          this.ref.close('conflict');
        } else if (err instanceof AppError && (err.code === 'INVALID_ASSIGNEE' || err.status === 400 || err.status === 404)) {
          this.error.set(err.message);
        } else {
          this.error.set('The claim was not assigned. Please try again.');
        }
      },
    });
  }
}
