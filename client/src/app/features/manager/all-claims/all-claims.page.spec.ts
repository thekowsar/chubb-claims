import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { envelope, makePage, makeSummary, provideApiTesting } from '../../../testing/test-helpers';
import { AllClaimsPage } from './all-claims.page';

describe('AllClaimsPage', () => {
  it('lists every claim with manager links and passes ?status=SUBMITTED through', async () => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting(), provideNoopAnimations(), provideRouter([{ path: 'claims', component: AllClaimsPage }])],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/claims?status=SUBMITTED');

    const req = http.expectOne((r) => r.url === '/api/claims');
    expect(req.request.params.getAll('status')).toEqual(['SUBMITTED']);
    req.flush(envelope(makePage([makeSummary({ status: 'SUBMITTED', assignedStaff: null })])));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('All claims');
    expect(harness.routeNativeElement?.querySelector('[data-testid="claim-link"]')?.getAttribute('href')).toBe('/manager/claims/4');
    http.verify();
  });
});
