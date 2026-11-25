import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { NotifyService } from '../../../core/notify/notify.service';
import { byTestId, envelope, errorEnvelope, makeClaim, provideApiTesting } from '../../../testing/test-helpers';
import { NewClaimPage } from './new-claim.page';

describe('NewClaimPage (T18)', () => {
  let fixture: ComponentFixture<NewClaimPage>;
  let page: NewClaimPage;
  let http: HttpTestingController;
  let notify: jasmine.SpyObj<NotifyService>;
  let router: Router;

  beforeEach(() => {
    notify = jasmine.createSpyObj<NotifyService>('NotifyService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [provideApiTesting(), provideNoopAnimations(), provideRouter([]), { provide: NotifyService, useValue: notify }],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(NewClaimPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function fillValid(): void {
    page.form.patchValue({
      type: 'MOTOR',
      market: 'SG',
      policyNumber: '  POL-SG-778812 ',
      incidentDate: new Date(2026, 10, 20),
      location: 'Orchard Road, Singapore',
      description: 'Rear-ended at a traffic light.',
      estimatedAmount: 4500,
    });
    fixture.detectChanges();
  }

  it('required errors appear after submit, and nothing is sent', () => {
    page.form.patchValue({ type: 'MOTOR' });
    page.submit();
    fixture.detectChanges();

    expect(page.form.controls.market.hasError('required')).toBeTrue();
    expect(page.form.controls.policyNumber.hasError('required')).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('mat-error').length).toBeGreaterThan(3);
    expect(byTestId<HTMLButtonElement>(fixture.nativeElement, 'submit')!.disabled).toBeTrue();
    http.expectNone('/api/claims');
  });

  it('currency follows the market and can still be changed', () => {
    page.form.controls.market.setValue('MY');
    expect(page.form.controls.currency.value).toBe('MYR');
    page.form.controls.market.setValue('ID');
    expect(page.form.controls.currency.value).toBe('IDR');
    page.form.controls.currency.setValue('SGD');
    expect(page.form.controls.currency.value).toBe('SGD');
  });

  it('a future incident date is rejected', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    page.form.controls.incidentDate.setValue(tomorrow);
    page.form.controls.incidentDate.markAsTouched();
    fixture.detectChanges();
    expect(page.form.controls.incidentDate.hasError('futureDate')).toBeTrue();
    expect(byTestId(fixture.nativeElement, 'future-date-error')).not.toBeNull();
  });

  it('description under 10 characters and 3 decimal places are invalid', () => {
    page.form.patchValue({ description: 'short', estimatedAmount: 1.234 });
    expect(page.form.controls.description.hasError('minlength')).toBeTrue();
    expect(page.form.controls.estimatedAmount.hasError('decimalPlaces')).toBeTrue();
  });

  it('a valid submit posts the right body, shows a snackbar and opens the detail page', () => {
    fillValid();
    byTestId<HTMLButtonElement>(fixture.nativeElement, 'submit')!.click();

    const req = http.expectOne('/api/claims');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      type: 'MOTOR',
      market: 'SG',
      currency: 'SGD',
      policyNumber: 'POL-SG-778812',
      incidentDate: '2026-11-20',
      location: 'Orchard Road, Singapore',
      description: 'Rear-ended at a traffic light.',
      estimatedAmount: 4500,
    });
    expect(page.saving()).toBeTrue();
    req.flush(envelope(makeClaim({ id: 9, claimNumber: 'CLM-2026-000009', status: 'SUBMITTED' })), {
      status: 201,
      statusText: 'Created',
    });

    expect(notify.success).toHaveBeenCalledWith('Claim CLM-2026-000009 submitted');
    expect(router.navigate).toHaveBeenCalledWith(['/claimant/claims', 9]);
  });

  it('server VALIDATION_FAILED errors are mapped onto fields, the rest into the banner', () => {
    fillValid();
    page.submit();
    http.expectOne('/api/claims').flush(
      errorEnvelope('VALIDATION_FAILED', 'Request validation failed', [
        { field: 'incidentDate', message: 'must not be in the future' },
        { field: null, message: 'Policy is not active' },
      ]),
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(page.form.controls.incidentDate.getError('server')).toBe('must not be in the future');
    expect(fixture.nativeElement.textContent).toContain('must not be in the future');
    expect(byTestId(fixture.nativeElement, 'form-banner')?.textContent).toContain('Policy is not active');
    expect(page.saving()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
