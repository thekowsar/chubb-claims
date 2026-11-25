import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  CLAIM_STATUSES,
  CLAIM_TYPES,
  ClaimFilter,
  ClaimStatus,
  ClaimType,
  MARKETS,
  Market,
  STATUS_LABEL,
} from '../../../core/models/claim.model';
import { fromIsoDate, toIsoDate } from '../../validators/date-utils';
import { dateRange } from '../../validators/date-range.validator';

/** Status (multi), market, type and submitted date range (05 §2.3, §6). Emits on Apply and Clear. */
@Component({
  selector: 'app-claim-filters',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatDatepickerModule, MatButtonModule],
  providers: [provideNativeDateAdapter()],
  template: `
    <form class="filters" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status" multiple data-testid="filter-status">
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ statusLabel[s] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Market</mat-label>
        <mat-select formControlName="market" data-testid="filter-market">
          <mat-option [value]="null">All</mat-option>
          @for (m of markets; track m) {
            <mat-option [value]="m">{{ m }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Type</mat-label>
        <mat-select formControlName="type" data-testid="filter-type">
          <mat-option [value]="null">All</mat-option>
          @for (t of types; track t) {
            <mat-option [value]="t">{{ t }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Submitted from</mat-label>
        <input matInput [matDatepicker]="fromPicker" formControlName="submittedFrom" data-testid="filter-from" />
        <mat-datepicker-toggle matIconSuffix [for]="fromPicker" />
        <mat-datepicker #fromPicker />
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Submitted to</mat-label>
        <input matInput [matDatepicker]="toPicker" formControlName="submittedTo" data-testid="filter-to" />
        <mat-datepicker-toggle matIconSuffix [for]="toPicker" />
        <mat-datepicker #toPicker />
      </mat-form-field>

      <div class="buttons">
        <button mat-flat-button color="primary" type="submit" data-testid="filter-apply" [disabled]="form.invalid">Apply</button>
        <button mat-button type="button" data-testid="filter-clear" (click)="reset()">Clear</button>
      </div>
      @if (form.hasError('dateRange')) {
        <p class="error" role="alert" data-testid="filter-date-error">"Submitted from" must be on or before "Submitted to".</p>
      }
    </form>
  `,
  styles: `
    .filters { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3); }
    mat-form-field { width: 170px; }
    .buttons { display: flex; gap: var(--space-2); }
    .error { width: 100%; margin: 0; color: var(--status-rejected); font-size: 13px; }
  `,
})
export class ClaimFiltersComponent {
  readonly value = input.required<ClaimFilter>();
  readonly apply = output<ClaimFilter>();
  readonly clear = output<void>();

  protected readonly statuses = CLAIM_STATUSES;
  protected readonly markets = MARKETS;
  protected readonly types = CLAIM_TYPES;
  protected readonly statusLabel = STATUS_LABEL;

  readonly form = inject(FormBuilder).group(
    {
      status: [[] as ClaimStatus[]],
      market: [null as Market | null],
      type: [null as ClaimType | null],
      submittedFrom: [null as Date | null],
      submittedTo: [null as Date | null],
    },
    { validators: dateRange('submittedFrom', 'submittedTo') },
  );

  constructor() {
    // Keep the form in step with the URL-driven filter (refresh, back button, shared links).
    effect(() => {
      const f = this.value();
      this.form.setValue(
        {
          status: [...f.status],
          market: f.market,
          type: f.type,
          submittedFrom: fromIsoDate(f.submittedFrom),
          submittedTo: fromIsoDate(f.submittedTo),
        },
        { emitEvent: false },
      );
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.apply.emit({
      status: v.status ?? [],
      market: v.market ?? null,
      type: v.type ?? null,
      submittedFrom: toIsoDate(v.submittedFrom),
      submittedTo: toIsoDate(v.submittedTo),
    });
  }

  reset(): void {
    this.form.reset({ status: [], market: null, type: null, submittedFrom: null, submittedTo: null });
    this.clear.emit();
  }
}
