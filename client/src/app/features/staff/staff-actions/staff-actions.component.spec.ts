import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ClaimDetail } from '../../../core/models/claim.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { byTestId, envelope, errorEnvelope, makeClaim, provideApiTesting } from '../../../testing/test-helpers';
import { RejectDialogComponent } from '../reject-dialog/reject-dialog.component';
import { SettleDialogComponent } from '../settle-dialog/settle-dialog.component';
import { StaffActionsComponent } from './staff-actions.component';

describe('StaffActionsComponent (T20)', () => {
  let fixture: ComponentFixture<StaffActionsComponent>;
  let http: HttpTestingController;
  let notify: jasmine.SpyObj<NotifyService>;
  let changed: number;

  beforeEach(() => {
    notify = jasmine.createSpyObj<NotifyService>('NotifyService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [provideApiTesting(), provideNoopAnimations(), { provide: NotifyService, useValue: notify }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(claim: ClaimDetail | null): HTMLElement {
    fixture = TestBed.createComponent(StaffActionsComponent);
    fixture.componentRef.setInput('claim', claim);
    changed = 0;
    fixture.componentInstance.changed.subscribe(() => changed++);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('renders nothing without a claim', () => {
    expect(create(null).textContent?.trim()).toBe('');
  });

  it('ASSIGNED shows Start work, which starts the claim and emits changed', () => {
    const el = create(makeClaim({ status: 'ASSIGNED', assessedAmount: null }));
    expect(byTestId(el, 'settle')).toBeNull();
    byTestId<HTMLButtonElement>(el, 'start')!.click();

    const req = http.expectOne('/api/claims/4/start');
    expect(req.request.method).toBe('POST');
    req.flush(envelope(makeClaim()));

    expect(notify.success).toHaveBeenCalledWith('Work started');
    expect(changed).toBe(1);
  });

  it('IN_PROGRESS shows Assess (pre-filled), Settle and Reject', () => {
    const el = create(makeClaim());
    expect(byTestId(el, 'start')).toBeNull();
    expect(byTestId(el, 'assessedAmount')).not.toBeNull();
    expect(fixture.componentInstance.assessForm.controls.assessedAmount.value).toBe(5800);
    expect(byTestId<HTMLButtonElement>(el, 'settle')!.disabled).toBeFalse();
    expect(byTestId(el, 'reject')).not.toBeNull();
  });

  it('Settle is disabled without an assessed amount, with a hint', () => {
    const el = create(makeClaim({ assessedAmount: null }));
    expect(byTestId<HTMLButtonElement>(el, 'settle')!.disabled).toBeTrue();
    expect(byTestId(el, 'settle-hint')?.textContent).toContain('Save an assessed amount first');
  });

  it('Save sends PATCH /assessment and emits changed', () => {
    const el = create(makeClaim({ assessedAmount: null }));
    fixture.componentInstance.assessForm.controls.assessedAmount.setValue(5800.5);
    fixture.detectChanges();
    byTestId<HTMLButtonElement>(el, 'save-assessment')!.click();

    const req = http.expectOne('/api/claims/4/assessment');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ assessedAmount: 5800.5 });
    req.flush(envelope(makeClaim({ assessedAmount: 5800.5 })));
    expect(changed).toBe(1);
  });

  it('a negative or 3-decimal assessed amount keeps Save disabled', () => {
    const el = create(makeClaim());
    fixture.componentInstance.assessForm.controls.assessedAmount.setValue(-1);
    fixture.detectChanges();
    expect(byTestId<HTMLButtonElement>(el, 'save-assessment')!.disabled).toBeTrue();
    fixture.componentInstance.assessForm.controls.assessedAmount.setValue(1.005);
    fixture.detectChanges();
    expect(byTestId<HTMLButtonElement>(el, 'save-assessment')!.disabled).toBeTrue();
  });

  it('Settle opens the dialog; when it closes with the settled claim, shows success and reloads', () => {
    const el = create(makeClaim());
    const dialog = TestBed.inject(MatDialog);
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of({ claim: makeClaim({ status: 'SETTLED' }) }) } as never);

    byTestId<HTMLButtonElement>(el, 'settle')!.click();

    expect(dialog.open).toHaveBeenCalledWith(SettleDialogComponent, jasmine.objectContaining({ data: { claim: jasmine.any(Object) } }));
    http.expectNone('/api/claims/4/settle'); // the dialog sends the request, not the panel
    expect(notify.success).toHaveBeenCalledWith('Claim CLM-2026-000004 settled');
    expect(changed).toBe(1);
  });

  it('Reject opens the dialog; cancelling does nothing', () => {
    const el = create(makeClaim());
    const dialog = TestBed.inject(MatDialog);
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as never);

    byTestId<HTMLButtonElement>(el, 'reject')!.click();

    expect(dialog.open).toHaveBeenCalledWith(RejectDialogComponent, jasmine.anything());
    expect(notify.success).not.toHaveBeenCalled();
    expect(changed).toBe(0);
  });

  it('Reject closing with the rejected claim shows success and reloads', () => {
    const el = create(makeClaim());
    spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of({ claim: makeClaim({ status: 'REJECTED' }) }) } as never);
    byTestId<HTMLButtonElement>(el, 'reject')!.click();
    expect(notify.success).toHaveBeenCalledWith('Claim CLM-2026-000004 rejected');
    expect(changed).toBe(1);
  });

  it('a dialog closing with conflict reloads without a success message (the dialog showed "changed, reloaded")', () => {
    const el = create(makeClaim());
    spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of('conflict') } as never);
    byTestId<HTMLButtonElement>(el, 'settle')!.click();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(changed).toBe(1);
  });

  for (const code of ['INVALID_STATUS_TRANSITION', 'CONCURRENT_MODIFICATION']) {
    it(`409 ${code} shows "changed, reloaded" and emits changed`, () => {
      const el = create(makeClaim({ status: 'ASSIGNED' }));
      byTestId<HTMLButtonElement>(el, 'start')!.click();
      http.expectOne('/api/claims/4/start').flush(errorEnvelope(code, 'x'), { status: 409, statusText: 'Conflict' });

      expect(notify.error).toHaveBeenCalledWith('This claim was changed. Reloaded.');
      expect(changed).toBe(1);
      expect(fixture.componentInstance.busy()).toBeFalse();
    });
  }

  it('a 400 from Save assessment shows the server message and does not reload', () => {
    const el = create(makeClaim());
    fixture.detectChanges(); // let the pre-filled assessed amount enable Save
    byTestId<HTMLButtonElement>(el, 'save-assessment')!.click();
    http.expectOne('/api/claims/4/assessment').flush(
      errorEnvelope('VALIDATION_FAILED', 'Request validation failed', [{ field: 'assessedAmount', message: 'must be 0 or more' }]),
      { status: 400, statusText: 'Bad Request' },
    );
    expect(notify.error).toHaveBeenCalledWith('must be 0 or more');
    expect(changed).toBe(0);
  });

  it('a 500 from Save assessment shows nothing of its own and does not reload (the interceptor popup is the one message)', () => {
    const el = create(makeClaim());
    fixture.detectChanges(); // let the pre-filled assessed amount enable Save
    byTestId<HTMLButtonElement>(el, 'save-assessment')!.click();
    http.expectOne('/api/claims/4/assessment').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'err' });

    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(changed).toBe(0);
    expect(fixture.componentInstance.busy()).toBeFalse();
  });

  it('a network error from start shows nothing of its own and keeps Start enabled for a retry', () => {
    const el = create(makeClaim({ status: 'ASSIGNED', assessedAmount: null }));
    byTestId<HTMLButtonElement>(el, 'start')!.click();
    http.expectOne('/api/claims/4/start').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(notify.error).not.toHaveBeenCalled();
    expect(changed).toBe(0);
    expect(byTestId<HTMLButtonElement>(el, 'start')!.disabled).toBeFalse();
  });

  it('closed and unassigned claims show no actions', () => {
    expect(byTestId(create(makeClaim({ status: 'SETTLED' })), 'no-actions')?.textContent).toContain('closed claim');
    fixture.destroy();
    expect(byTestId(create(makeClaim({ status: 'SUBMITTED' })), 'no-actions')?.textContent).toContain('waiting for assignment');
  });
});
