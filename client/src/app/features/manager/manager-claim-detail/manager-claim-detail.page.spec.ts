import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { ClaimDetail } from '../../../core/models/claim.model';
import { NotifyService } from '../../../core/notify/notify.service';
import { envelope, makeClaim, makeHistory, provideApiTesting } from '../../../testing/test-helpers';
import { AssignDialogComponent } from '../assign-dialog/assign-dialog.component';
import { ManagerClaimDetailPage } from './manager-claim-detail.page';

describe('ManagerClaimDetailPage', () => {
  let http: HttpTestingController;
  let notify: jasmine.SpyObj<NotifyService>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    notify = jasmine.createSpyObj<NotifyService>('NotifyService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        provideApiTesting(),
        provideNoopAnimations(),
        provideRouter([{ path: 'claims/:id', component: ManagerClaimDetailPage }], withComponentInputBinding()),
        { provide: NotifyService, useValue: notify },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(claim: ClaimDetail): Promise<HTMLElement> {
    await harness.navigateByUrl('/claims/4');
    flush(claim);
    return harness.routeNativeElement as HTMLElement;
  }

  function flush(claim: ClaimDetail): void {
    http.expectOne('/api/claims/4').flush(envelope(claim));
    http.expectOne('/api/claims/4/messages').flush(envelope([]));
    http.expectOne('/api/claims/4/history').flush(envelope(makeHistory()));
    harness.detectChanges();
  }

  it('SUBMITTED shows Assign…', async () => {
    const el = await open(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    expect(el.querySelector('[data-testid="assign"]')?.textContent?.trim()).toBe('Assign…');
  });

  it('ASSIGNED shows Reassign…', async () => {
    const el = await open(makeClaim({ status: 'ASSIGNED' }));
    expect(el.querySelector('[data-testid="assign"]')?.textContent?.trim()).toBe('Reassign…');
  });

  it('IN_PROGRESS shows no assign button', async () => {
    const el = await open(makeClaim({ status: 'IN_PROGRESS' }));
    expect(el.querySelector('[data-testid="assign"]')).toBeNull();
    expect(el.querySelector('[data-testid="no-actions"]')).not.toBeNull();
  });

  it('a successful assign shows a snackbar and reloads the claim', async () => {
    const el = await open(makeClaim({ status: 'SUBMITTED', assignedStaff: null }));
    const assigned = makeClaim({ status: 'ASSIGNED', assignedStaff: { id: 4, displayName: 'Dana Ng' } });
    const dialog = TestBed.inject(MatDialog);
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of({ claim: assigned }) } as never);

    el.querySelector<HTMLButtonElement>('[data-testid="assign"]')!.click();

    expect(dialog.open).toHaveBeenCalledWith(AssignDialogComponent, jasmine.objectContaining({ data: jasmine.any(Object) }));
    expect(notify.success).toHaveBeenCalledWith('CLM-2026-000004 assigned to Dana Ng');
    flush(assigned);
    expect(el.querySelector('[data-testid="assigned-to"]')?.textContent).toBe('Dana Ng');
  });

  it('a conflict reloads without a success message; cancel does nothing', async () => {
    const el = await open(makeClaim({ status: 'ASSIGNED' }));
    const dialog = TestBed.inject(MatDialog);
    const open$ = spyOn(dialog, 'open');

    open$.and.returnValue({ afterClosed: () => of(undefined) } as never);
    el.querySelector<HTMLButtonElement>('[data-testid="assign"]')!.click();
    http.expectNone('/api/claims/4');

    open$.and.returnValue({ afterClosed: () => of('conflict') } as never);
    el.querySelector<HTMLButtonElement>('[data-testid="assign"]')!.click();
    expect(notify.success).not.toHaveBeenCalled();
    flush(makeClaim({ status: 'IN_PROGRESS' }));
  });
});
