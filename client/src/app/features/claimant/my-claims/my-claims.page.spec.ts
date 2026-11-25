import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ClaimListComponent } from '../../../shared/claims/claim-list/claim-list.component';
import { envelope, makePage, provideApiTesting } from '../../../testing/test-helpers';
import { MyClaimsPage } from './my-claims.page';

describe('MyClaimsPage', () => {
  it('shows the claim list in claimant mode with no default statuses', async () => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting(), provideNoopAnimations(), provideRouter([{ path: 'claims', component: MyClaimsPage }])],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/claims');

    const req = http.expectOne((r) => r.url === '/api/claims');
    expect(req.request.params.has('status')).toBeFalse();
    req.flush(envelope(makePage([])));
    harness.detectChanges();

    const list = harness.fixture.debugElement.query((d) => d.componentInstance instanceof ClaimListComponent)
      .componentInstance as ClaimListComponent;
    expect(list.mode()).toBe('claimant');
    expect(harness.routeNativeElement?.textContent).toContain('My claims');
    http.verify();
  });
});
