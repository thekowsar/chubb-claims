import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ClaimDetail } from '../../../core/models/claim.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { USERS, byTestId, envelope, errorEnvelope, makeClaim, provideApiTesting } from '../../../testing/test-helpers';
import { AssignDialogComponent } from './assign-dialog.component';

describe('AssignDialogComponent (T22)', () => {
  let fixture: ComponentFixture<AssignDialogComponent>;
  let http: HttpTestingController;
  let ref: jasmine.SpyObj<MatDialogRef<AssignDialogComponent>>;
  let notify: jasmine.SpyObj<NotifyService>;
  const STAFF = [USERS.CLAIMS_STAFF, { id: 4, username: 'staff2', displayName: 'Dana Ng', role: 'CLAIMS_STAFF' as const }];

  function create(claim: ClaimDetail): HTMLElement {
    ref = jasmine.createSpyObj<MatDialogRef<AssignDialogComponent>>('MatDialogRef', ['close']);
    notify = jasmine.createSpyObj<NotifyService>('NotifyService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        provideApiTesting(),
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: { claim } },
        { provide: NotifyService, useValue: notify },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssignDialogComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  afterEach(() => http.verify());

  const confirm = () => byTestId<HTMLButtonElement>(fixture.nativeElement, 'confirm')!;

  it('loads the staff list, showing "Loading…" first', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    expect(byTestId(el, 'staff-loading')).not.toBeNull();
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.detectChanges();
    expect(byTestId(el, 'staff-loading')).toBeNull();
    expect(byTestId(el, 'staff-select')).not.toBeNull();
    expect(fixture.componentInstance.staff().map((s) => s.displayName)).toEqual(['Chris Lim', 'Dana Ng']);
  });

  it('Assign is disabled until a staff member is picked', () => {
    create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.detectChanges();
    expect(confirm().disabled).toBeTrue();
    fixture.componentInstance.form.controls.staffId.setValue(4);
    fixture.detectChanges();
    expect(confirm().disabled).toBeFalse();
  });

  it('a reassign starts on the current staff member and says Reassign', () => {
    const el = create(makeClaim({ status: 'ASSIGNED' }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.detectChanges();
    expect(el.textContent).toContain('Reassign CLM-2026-000004');
    expect(fixture.componentInstance.form.controls.staffId.value).toBe(3);
  });

  it('with no staff shows "No staff available." and Assign stays disabled', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope([]));
    fixture.detectChanges();
    expect(byTestId(el, 'no-staff')).not.toBeNull();
    expect(confirm().disabled).toBeTrue();
  });

  it('success PUTs the assignment and closes with the updated claim', () => {
    create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.componentInstance.form.controls.staffId.setValue(4);
    fixture.detectChanges();
    confirm().click();

    const req = http.expectOne('/api/claims/4/assignment');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ staffId: 4 });
    const updated = makeClaim({ status: 'ASSIGNED', assignedStaff: { id: 4, displayName: 'Dana Ng' } });
    req.flush(envelope(updated));
    expect(ref.close).toHaveBeenCalledWith({ claim: updated });
  });

  it('INVALID_ASSIGNEE shows inline and keeps the dialog open', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.componentInstance.form.controls.staffId.setValue(5);
    fixture.componentInstance.assign();
    http.expectOne('/api/claims/4/assignment').flush(errorEnvelope('INVALID_ASSIGNEE', 'User 5 is not a claims staff member'), {
      status: 400,
      statusText: 'Bad Request',
    });
    fixture.detectChanges();

    expect(byTestId(el, 'assign-error')?.textContent).toContain('User 5 is not a claims staff member');
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('a 500 on assign keeps the dialog open with no inline error, so Assign can be pressed again', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.componentInstance.form.controls.staffId.setValue(3);
    fixture.componentInstance.assign();
    http.expectOne('/api/claims/4/assignment').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(ref.close).not.toHaveBeenCalled();
    expect(byTestId(el, 'assign-error')).toBeNull();
    expect(notify.error).not.toHaveBeenCalled();
    expect(confirm().disabled).toBeFalse();
  });

  it('a network error on the staff list shows Retry only, which loads it again', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(byTestId(el, 'assign-error')).toBeNull();
    expect(byTestId(el, 'no-staff')).toBeNull();

    byTestId<HTMLButtonElement>(el, 'staff-retry')!.click();
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.detectChanges();
    expect(byTestId(el, 'staff-select')).not.toBeNull();
  });

  it('a network error on assign keeps the dialog open with no inline error', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.componentInstance.form.controls.staffId.setValue(3);
    fixture.componentInstance.assign();
    http.expectOne('/api/claims/4/assignment').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(ref.close).not.toHaveBeenCalled();
    expect(byTestId(el, 'assign-error')).toBeNull();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('a 500 on the staff list shows Retry only', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'err' });
    fixture.detectChanges();
    expect(byTestId(el, 'staff-retry')).not.toBeNull();
    expect(byTestId(el, 'assign-error')).toBeNull();
    expect(byTestId(el, 'no-staff')).toBeNull();
  });

  it('a 400 VALIDATION_FAILED on assign shows inline and keeps the dialog open', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.componentInstance.form.controls.staffId.setValue(3);
    fixture.componentInstance.assign();
    http.expectOne('/api/claims/4/assignment').flush(errorEnvelope('VALIDATION_FAILED', 'Request validation failed'), {
      status: 400,
      statusText: 'Bad Request',
    });
    fixture.detectChanges();
    expect(byTestId(el, 'assign-error')?.textContent).toContain('Request validation failed');
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('a 403 on assign closes the dialog with no inline error or extra snackbar', () => {
    const el = create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.componentInstance.form.controls.staffId.setValue(3);
    fixture.componentInstance.assign();
    http.expectOne('/api/claims/4/assignment').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(ref.close).toHaveBeenCalledWith();
    expect(byTestId(el, 'assign-error')).toBeNull();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('a 403 on the staff list closes the dialog', () => {
    create(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    expect(ref.close).toHaveBeenCalledWith();
    expect(fixture.componentInstance.error()).toBeNull();
  });

  it('409 shows a snackbar and closes with conflict so the page reloads', () => {
    create(makeClaim({ status: 'ASSIGNED' }));
    http.expectOne('/api/users?role=CLAIMS_STAFF').flush(envelope(STAFF));
    fixture.componentInstance.assign();
    http.expectOne('/api/claims/4/assignment').flush(errorEnvelope('INVALID_STATUS_TRANSITION', 'x'), { status: 409, statusText: 'c' });

    expect(notify.error).toHaveBeenCalledWith('This claim was changed. Reloaded.');
    expect(ref.close).toHaveBeenCalledWith('conflict');
  });
});
