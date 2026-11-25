import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { AppError } from '../../../core/http/app-error';
import { CreateClaimRequest } from '../../../core/models/claim-requests.model';
import { CURRENCIES, ClaimType, Currency, MARKETS, MARKET_CURRENCY, Market } from '../../../core/models/claim.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { ClaimService } from '../../../shared/claims/claim.service';
import { applyServerErrors } from '../../../shared/forms/apply-server-errors';
import { toIsoDate } from '../../../shared/validators/date-utils';
import { decimalPlaces } from '../../../shared/validators/decimal-places.validator';
import { notBlank } from '../../../shared/validators/not-blank.validator';
import { notFutureDate } from '../../../shared/validators/not-future-date.validator';

/** Screen 4: submit a claim (05 §2.4, §6). Currency follows the market and can be changed. */
@Component({
  selector: 'app-new-claim-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatDatepickerModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h1 data-testid="page-title">New claim</h1>
    <mat-card class="card">
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (banner().length) {
            <div class="banner" role="alert" data-testid="form-banner">
              @for (msg of banner(); track $index) {
                <div>{{ msg }}</div>
              }
            </div>
          }

          <div class="row">
            <label id="type-label" class="label">Type</label>
            <mat-radio-group formControlName="type" aria-labelledby="type-label" data-testid="type">
              <mat-radio-button value="MOTOR">Motor</mat-radio-button>
              <mat-radio-button value="PROPERTY">Property</mat-radio-button>
            </mat-radio-group>
          </div>

          <div class="pair">
            <mat-form-field appearance="outline">
              <mat-label>Market</mat-label>
              <mat-select formControlName="market" data-testid="market">
                @for (m of markets; track m) {
                  <mat-option [value]="m">{{ m }}</mat-option>
                }
              </mat-select>
              @if (form.controls.market.hasError('required')) {
                <mat-error>Market is required</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Currency</mat-label>
              <mat-select formControlName="currency" data-testid="currency">
                @for (c of currencies; track c) {
                  <mat-option [value]="c">{{ c }}</mat-option>
                }
              </mat-select>
              @if (form.controls.currency.hasError('required')) {
                <mat-error>Currency is required</mat-error>
              }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Policy number</mat-label>
            <input matInput formControlName="policyNumber" maxlength="30" data-testid="policyNumber" />
            @if (form.controls.policyNumber.hasError('required') || form.controls.policyNumber.hasError('blank')) {
              <mat-error>Policy number is required</mat-error>
            }
            @if (form.controls.policyNumber.hasError('server')) {
              <mat-error>{{ form.controls.policyNumber.getError('server') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Incident date</mat-label>
            <input matInput [matDatepicker]="picker" [max]="today" formControlName="incidentDate" data-testid="incidentDate" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
            @if (form.controls.incidentDate.hasError('required')) {
              <mat-error>Incident date is required</mat-error>
            }
            @if (form.controls.incidentDate.hasError('futureDate') || form.controls.incidentDate.hasError('matDatepickerMax')) {
              <mat-error data-testid="future-date-error">Incident date can't be in the future</mat-error>
            }
            @if (form.controls.incidentDate.hasError('server')) {
              <mat-error>{{ form.controls.incidentDate.getError('server') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Location</mat-label>
            <input matInput formControlName="location" maxlength="200" data-testid="location" />
            @if (form.controls.location.hasError('required') || form.controls.location.hasError('blank')) {
              <mat-error>Location is required</mat-error>
            }
            @if (form.controls.location.hasError('server')) {
              <mat-error>{{ form.controls.location.getError('server') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="4" maxlength="2000" data-testid="description"></textarea>
            <mat-hint align="end">{{ form.controls.description.value.length }}/2000</mat-hint>
            @if (form.controls.description.hasError('required')) {
              <mat-error>Description is required</mat-error>
            }
            @if (form.controls.description.hasError('minlength')) {
              <mat-error>Description needs at least 10 characters</mat-error>
            }
            @if (form.controls.description.hasError('server')) {
              <mat-error>{{ form.controls.description.getError('server') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Estimated amount</mat-label>
            <input matInput type="number" min="0.01" step="0.01" formControlName="estimatedAmount" data-testid="estimatedAmount" />
            @if (form.controls.estimatedAmount.hasError('required')) {
              <mat-error>Estimated amount is required</mat-error>
            }
            @if (form.controls.estimatedAmount.hasError('min')) {
              <mat-error>Must be greater than 0</mat-error>
            }
            @if (form.controls.estimatedAmount.hasError('decimalPlaces')) {
              <mat-error>At most 2 decimal places</mat-error>
            }
            @if (form.controls.estimatedAmount.hasError('server')) {
              <mat-error>{{ form.controls.estimatedAmount.getError('server') }}</mat-error>
            }
          </mat-form-field>

          <div class="buttons">
            <a mat-button routerLink="/claimant/claims" data-testid="cancel">Cancel</a>
            <button mat-flat-button color="primary" type="submit" data-testid="submit" [disabled]="form.invalid || saving()">
              @if (saving()) {
                <mat-spinner diameter="20" />
              } @else {
                Submit claim
              }
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    h1 { margin: 0 0 var(--space-3); font-size: 24px; font-weight: 400; }
    .card { max-width: 640px; }
    .full { width: 100%; }
    .pair { display: flex; gap: var(--space-3); }
    .pair mat-form-field { flex: 1; }
    .row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
    .label { color: #666; }
    .buttons { display: flex; justify-content: flex-end; gap: var(--space-2); }
    .banner { padding: var(--space-2) var(--space-3); margin-bottom: var(--space-3); background: #fdecea; color: var(--status-rejected); border-radius: 4px; }
  `,
})
export class NewClaimPage {
  private readonly claims = inject(ClaimService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly markets = MARKETS;
  protected readonly currencies = CURRENCIES;
  protected readonly today = new Date();

  readonly saving = signal(false);
  readonly banner = signal<string[]>([]);

  readonly form = this.fb.group({
    type: this.fb.control<ClaimType>('MOTOR', { nonNullable: true, validators: Validators.required }),
    market: this.fb.control<Market | null>(null, Validators.required),
    currency: this.fb.control<Currency | null>(null, Validators.required),
    policyNumber: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30), notBlank] }),
    incidentDate: this.fb.control<Date | null>(null, [Validators.required, notFutureDate()]),
    location: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200), notBlank] }),
    description: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
    }),
    estimatedAmount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01), decimalPlaces(2)]),
  });

  constructor() {
    // Currency is set from the market (SG -> SGD, ...) and can still be changed by hand.
    this.form.controls.market.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((market) => {
      if (market) {
        this.form.controls.currency.setValue(MARKET_CURRENCY[market]);
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: CreateClaimRequest = {
      type: v.type,
      market: v.market as Market,
      currency: v.currency as Currency,
      policyNumber: v.policyNumber.trim(),
      incidentDate: toIsoDate(v.incidentDate) as string,
      location: v.location.trim(),
      description: v.description.trim(),
      estimatedAmount: Number(v.estimatedAmount),
    };
    this.saving.set(true);
    this.banner.set([]);
    this.claims.create(request).subscribe({
      next: (claim) => {
        this.saving.set(false);
        this.notify.success(`Claim ${claim.claimNumber} submitted`);
        void this.router.navigate(['/claimant/claims', claim.id]);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (err instanceof AppError && err.code === 'VALIDATION_FAILED') {
          const unmatched = applyServerErrors(this.form, err.details);
          this.banner.set(err.details.length ? unmatched : [err.message]);
        } else if (err instanceof AppError && [400, 404, 409].includes(err.status)) {
          this.banner.set([err.message]);
        }
        // 0, 401, 403 and 5xx are already shown by the error interceptor.
      },
    });
  }
}
