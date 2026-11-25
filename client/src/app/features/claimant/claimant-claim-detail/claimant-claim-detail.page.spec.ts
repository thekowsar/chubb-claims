import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ClaimDetailComponent } from '../../../shared/claims/claim-detail/claim-detail.component';
import { provideApiTesting } from '../../../testing/test-helpers';
import { ClaimantClaimDetailPage } from './claimant-claim-detail.page';

describe('ClaimantClaimDetailPage', () => {
  it('passes the route id as a number, in claimant mode, with Back to My claims', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideApiTesting(),
        provideNoopAnimations(),
        provideRouter([{ path: 'claims/:id', component: ClaimantClaimDetailPage }], withComponentInputBinding()),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/claims/7');

    http.expectOne('/api/claims/7');
    http.expectOne('/api/claims/7/messages');
    http.expectOne('/api/claims/7/history');
    const detail = harness.fixture.debugElement.query((d) => d.componentInstance instanceof ClaimDetailComponent)
      .componentInstance as ClaimDetailComponent;
    expect(detail.claimId()).toBe(7);
    expect(detail.mode()).toBe('claimant');
    expect(detail.backLink()).toBe('/claimant/claims');
    http.verify();
  });
});
