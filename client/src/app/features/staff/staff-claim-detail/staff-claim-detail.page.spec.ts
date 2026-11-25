import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NotifyService } from '../../../core/notify/notify.service';
import { envelope, makeClaim, makeHistory, provideApiTesting } from '../../../testing/test-helpers';
import { StaffActionsComponent } from '../staff-actions/staff-actions.component';
import { StaffClaimDetailPage } from './staff-claim-detail.page';

describe('StaffClaimDetailPage', () => {
  it('shows the staff actions for the loaded claim and reloads after an action', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideApiTesting(),
        provideNoopAnimations(),
        provideRouter([{ path: 'claims/:id', component: StaffClaimDetailPage }], withComponentInputBinding()),
        { provide: NotifyService, useValue: jasmine.createSpyObj('NotifyService', ['success', 'error']) },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/claims/4');

    const flush = (status: 'ASSIGNED' | 'IN_PROGRESS') => {
      http.expectOne('/api/claims/4').flush(envelope(makeClaim({ status })));
      http.expectOne('/api/claims/4/messages').flush(envelope([]));
      http.expectOne('/api/claims/4/history').flush(envelope(makeHistory()));
      harness.detectChanges();
    };
    flush('ASSIGNED');

    const actions = harness.fixture.debugElement.query((d) => d.componentInstance instanceof StaffActionsComponent)
      .componentInstance as StaffActionsComponent;
    expect(actions.claim()?.status).toBe('ASSIGNED');
    const start = harness.routeNativeElement?.querySelector<HTMLButtonElement>('[data-testid="start"]');
    start?.click();
    http.expectOne('/api/claims/4/start').flush(envelope(makeClaim()));

    flush('IN_PROGRESS');
    expect(actions.claim()?.status).toBe('IN_PROGRESS');
    expect(harness.routeNativeElement?.querySelector('[data-testid="back"]')?.getAttribute('href')).toBe('/staff/queue');
    http.verify();
  });
});
