import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NotifyService } from '../../../core/notify/notify.service';
import { byTestId, envelope, errorEnvelope, makeClaim, provideApiTesting } from '../../../testing/test-helpers';
import { SettleDialogComponent } from './settle-dialog.component';

describe('SettleDialogComponent (T21)', () => {
  let fixture: ComponentFixture<SettleDialogComponent>;
  let ref: jasmine.SpyObj<MatDialogRef<SettleDialogComponent>>;
  let notify: jasmine.SpyObj<NotifyService>;
  let http: HttpTestingController;

  beforeEach(() => {
    ref = jasmine.createSpyObj<MatDialogRef<SettleDialogComponent>>('MatDialogRef', ['close']);
    notify = jasmine.createSpyObj<NotifyService>('NotifyService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        provideApiTesting(),
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: { claim: makeClaim({ assessedAmount: 5800 }) } },
        { provide: NotifyService, useValue: notify },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SettleDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const confirm = () => byTestId<HTMLButtonElement>(fixture.nativeElement, 'confirm')!;

  function submitValid(): void {
    fixture.componentInstance.form.setValue({ settledAmount: 5500, decisionNote: '  Approved. Excess applied. ' });
    fixture.detectChanges();
    confirm().click();
  }

  it('starts with the assessed amount and shows it', () => {
    expect(fixture.componentInstance.form.controls.settledAmount.value).toBe(5800);
    expect(fixture.nativeElement.textContent).toContain('MYR 5,800.00');
  });

  it('the decision note is required (whitespace alone is not enough)', () => {
    expect(confirm().disabled).toBeTrue();
    fixture.componentInstance.form.controls.decisionNote.setValue('   ');
    fixture.detectChanges();
    expect(confirm().disabled).toBeTrue();
    fixture.componentInstance.confirm();
    http.expectNone('/api/claims/4/settle');
  });

  it('a settled amount above the assessed amount shows an error', () => {
    const control = fixture.componentInstance.form.controls.settledAmount;
    control.setValue(5800.01);
    control.markAsTouched();
    fixture.detectChanges();
    expect(control.hasError('maxAmount')).toBeTrue();
    expect(byTestId(fixture.nativeElement, 'max-error')).not.toBeNull();
  });

  it('zero is not allowed', () => {
    fixture.componentInstance.form.controls.settledAmount.setValue(0);
    expect(fixture.componentInstance.form.controls.settledAmount.hasError('min')).toBeTrue();
  });

  it('valid input POSTs the trimmed body and closes with the updated claim', () => {
    submitValid();
    const req = http.expectOne('/api/claims/4/settle');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ settledAmount: 5500, decisionNote: 'Approved. Excess applied.' });
    expect(fixture.componentInstance.saving()).toBeTrue();

    const settled = makeClaim({ status: 'SETTLED', settledAmount: 5500 });
    req.flush(envelope(settled));
    expect(ref.close).toHaveBeenCalledWith({ claim: settled });
  });

  it('a 400 shows the server message inline and keeps the dialog open', () => {
    submitValid();
    http.expectOne('/api/claims/4/settle').flush(
      errorEnvelope('VALIDATION_FAILED', 'Request validation failed', [
        { field: 'settledAmount', message: 'must not exceed the assessed amount' },
      ]),
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(byTestId(fixture.nativeElement, 'dialog-error')?.textContent).toContain('must not exceed the assessed amount');
    expect(ref.close).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(confirm().disabled).toBeFalse();
  });

  it('a 409 shows "changed, reloaded" and closes with conflict', () => {
    submitValid();
    http.expectOne('/api/claims/4/settle').flush(errorEnvelope('INVALID_STATUS_TRANSITION', 'x'), { status: 409, statusText: 'Conflict' });

    expect(notify.error).toHaveBeenCalledOnceWith('This claim was changed. Reloaded.');
    expect(ref.close).toHaveBeenCalledWith('conflict');
  });

  it('a 500 or network error shows nothing of its own and keeps the dialog open for a retry', () => {
    submitValid();
    http.expectOne('/api/claims/4/settle').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'err' });
    fixture.detectChanges();
    expect(byTestId(fixture.nativeElement, 'dialog-error')).toBeNull();
    expect(ref.close).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();

    confirm().click();
    http.expectOne('/api/claims/4/settle').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(byTestId(fixture.nativeElement, 'dialog-error')).toBeNull();
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('a 403 closes the dialog quietly (the interceptor reports it)', () => {
    submitValid();
    http.expectOne('/api/claims/4/settle').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    expect(ref.close).toHaveBeenCalledWith();
    expect(notify.error).not.toHaveBeenCalled();
  });
});
