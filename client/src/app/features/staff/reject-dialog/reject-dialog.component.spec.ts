import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NotifyService } from '../../../core/notify/notify.service';
import { byTestId, envelope, errorEnvelope, makeClaim, provideApiTesting } from '../../../testing/test-helpers';
import { RejectDialogComponent } from './reject-dialog.component';

describe('RejectDialogComponent (T21)', () => {
  let fixture: ComponentFixture<RejectDialogComponent>;
  let ref: jasmine.SpyObj<MatDialogRef<RejectDialogComponent>>;
  let notify: jasmine.SpyObj<NotifyService>;
  let http: HttpTestingController;

  beforeEach(() => {
    ref = jasmine.createSpyObj<MatDialogRef<RejectDialogComponent>>('MatDialogRef', ['close']);
    notify = jasmine.createSpyObj<NotifyService>('NotifyService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        provideApiTesting(),
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: { claim: makeClaim() } },
        { provide: NotifyService, useValue: notify },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RejectDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function submitValid(): void {
    fixture.componentInstance.form.setValue({ decisionNote: ' Not covered by the policy. ' });
    fixture.detectChanges();
    byTestId<HTMLButtonElement>(fixture.nativeElement, 'confirm')!.click();
  }

  it('shows the claim number in the title', () => {
    expect(fixture.nativeElement.textContent).toContain('Reject CLM-2026-000004');
  });

  it('the note is required', () => {
    expect(byTestId<HTMLButtonElement>(fixture.nativeElement, 'confirm')!.disabled).toBeTrue();
    fixture.componentInstance.confirm();
    http.expectNone('/api/claims/4/reject');
  });

  it('valid input POSTs the trimmed note and closes with the updated claim', () => {
    submitValid();
    const req = http.expectOne('/api/claims/4/reject');
    expect(req.request.body).toEqual({ decisionNote: 'Not covered by the policy.' });
    const rejected = makeClaim({ status: 'REJECTED' });
    req.flush(envelope(rejected));
    expect(ref.close).toHaveBeenCalledWith({ claim: rejected });
  });

  it('a 400 shows inline and keeps the dialog open', () => {
    submitValid();
    http.expectOne('/api/claims/4/reject').flush(
      errorEnvelope('VALIDATION_FAILED', 'Request validation failed', [{ field: 'decisionNote', message: 'must not be blank' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(byTestId(fixture.nativeElement, 'dialog-error')?.textContent).toContain('must not be blank');
    expect(ref.close).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('a 409 shows "changed, reloaded" and closes with conflict', () => {
    submitValid();
    http.expectOne('/api/claims/4/reject').flush(errorEnvelope('CONCURRENT_MODIFICATION', 'x'), { status: 409, statusText: 'Conflict' });
    expect(notify.error).toHaveBeenCalledOnceWith('This claim was changed. Reloaded.');
    expect(ref.close).toHaveBeenCalledWith('conflict');
  });

  it('a 500 or network error shows nothing of its own and keeps the dialog open', () => {
    submitValid();
    http.expectOne('/api/claims/4/reject').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(byTestId(fixture.nativeElement, 'dialog-error')).toBeNull();
    expect(ref.close).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });
});
