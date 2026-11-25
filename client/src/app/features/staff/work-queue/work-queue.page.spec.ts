import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { envelope, makePage, makeSummary, provideApiTesting } from '../../../testing/test-helpers';
import { WorkQueuePage } from './work-queue.page';

describe('WorkQueuePage', () => {
  it('lists my ASSIGNED and IN_PROGRESS claims with staff detail links', async () => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting(), provideNoopAnimations(), provideRouter([{ path: 'queue', component: WorkQueuePage }])],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/queue');

    const req = http.expectOne((r) => r.url === '/api/claims');
    expect(req.request.params.getAll('status')).toEqual(['ASSIGNED', 'IN_PROGRESS']);
    req.flush(envelope(makePage([makeSummary()])));
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('My work queue');
    const link = harness.routeNativeElement?.querySelector('[data-testid="claim-link"]');
    expect(link?.getAttribute('href')).toBe('/staff/claims/4');
    http.verify();
  });
});
