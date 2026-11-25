import { Component } from '@angular/core';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ClaimStatus } from '../../../core/models/claim.model';
import {
  allByTestId,
  byTestId,
  envelope,
  errorEnvelope,
  makePage,
  makeSummary,
  provideApiTesting,
} from '../../../testing/test-helpers';
import { ClaimListComponent } from './claim-list.component';

@Component({ standalone: true, imports: [ClaimListComponent], template: `<app-claim-list mode="claimant" title="My claims" />` })
class ClaimantHost {}

@Component({
  standalone: true,
  imports: [ClaimListComponent],
  template: `<app-claim-list mode="staff" title="My work queue" [defaultStatuses]="defaults" />`,
})
class StaffHost {
  defaults: ClaimStatus[] = ['ASSIGNED', 'IN_PROGRESS'];
}

@Component({ standalone: true, imports: [ClaimListComponent], template: `<app-claim-list mode="manager" title="All claims" />` })
class ManagerHost {}

describe('ClaimListComponent (T17)', () => {
  let http: HttpTestingController;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideApiTesting(),
        provideNoopAnimations(),
        provideRouter([
          { path: 'claimant', component: ClaimantHost },
          { path: 'staff', component: StaffHost },
          { path: 'manager', component: ManagerHost },
          { path: 'claimant/claims/new', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const el = () => harness.routeNativeElement as HTMLElement;

  function expectSearch(): TestRequest {
    return http.expectOne((r) => r.url === '/api/claims');
  }

  async function open(url: string): Promise<TestRequest> {
    await harness.navigateByUrl(url);
    return expectSearch();
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('loads on init with default paging and renders rows', async () => {
    const req = await open('/claimant');
    expect(req.request.urlWithParams).toBe('/api/claims?page=0&size=20&sort=createdAt,desc');
    expect(byTestId(el(), 'skeleton')).not.toBeNull();

    req.flush(envelope(makePage([makeSummary(), makeSummary({ id: 5, claimNumber: 'CLM-2026-000005', status: 'SUBMITTED' })])));
    harness.detectChanges();

    const rows = allByTestId(el(), 'claim-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('CLM-2026-000004');
    expect(rows[0].textContent).toContain('MYR 6,200.00');
    expect(rows[0].textContent).toContain('In progress');
    expect(byTestId(el(), 'skeleton')).toBeNull();
    const link = byTestId<HTMLAnchorElement>(el(), 'claim-link')!;
    expect(link.getAttribute('href')).toBe('/claimant/claims/4');
  });

  it('claimant mode shows "New claim" and hides the Claimant / Assigned columns', async () => {
    (await open('/claimant')).flush(envelope(makePage([makeSummary()])));
    harness.detectChanges();
    expect(byTestId(el(), 'new-claim')).not.toBeNull();
    expect(el().textContent).not.toContain('Assigned to');
  });

  it('manager mode has no "New claim" button and shows Claimant and Assigned to', async () => {
    (await open('/manager')).flush(envelope(makePage([makeSummary()])));
    harness.detectChanges();
    expect(byTestId(el(), 'new-claim')).toBeNull();
    expect(el().textContent).toContain('Assigned to');
    expect(el().textContent).toContain('Ben Wong');
    expect(byTestId<HTMLAnchorElement>(el(), 'claim-link')!.getAttribute('href')).toBe('/manager/claims/4');
  });

  it('staff mode asks for ASSIGNED and IN_PROGRESS by default', async () => {
    const req = await open('/staff');
    expect(req.request.params.getAll('status')).toEqual(['ASSIGNED', 'IN_PROGRESS']);
    req.flush(envelope(makePage([])));
    harness.detectChanges();
    expect(byTestId(el(), 'empty-text')?.textContent).toBe('No claims are assigned to you right now.');
    expect(byTestId(el(), 'empty-action')).toBeNull();
  });

  it('reads filters and paging from the query params', async () => {
    const req = await open('/manager?status=SUBMITTED&status=ASSIGNED&market=SG&type=MOTOR&page=1&size=50&sort=claimNumber,asc');
    expect(req.request.urlWithParams).toBe(
      '/api/claims?status=SUBMITTED&status=ASSIGNED&market=SG&type=MOTOR&page=1&size=50&sort=claimNumber,asc',
    );
    req.flush(envelope(makePage([])));
  });

  it('ignores unknown filter values in the URL', async () => {
    const req = await open('/manager?status=NOPE&market=XX&sort=password,asc');
    expect(req.request.urlWithParams).toBe('/api/claims?page=0&size=20&sort=createdAt,desc');
    req.flush(envelope(makePage([])));
  });

  it('applying a filter resets to page 0, updates the URL and calls the API', async () => {
    (await open('/manager?page=3')).flush(envelope(makePage([makeSummary()], 3, 20, 80)));
    harness.detectChanges();

    const list = harness.fixture.debugElement.query((d) => d.componentInstance instanceof ClaimListComponent)
      .componentInstance as ClaimListComponent;
    list.applyFilter({ status: ['SETTLED'], market: null, type: 'PROPERTY', submittedFrom: '2026-11-01', submittedTo: null });
    await settle();

    expect(router.url).toBe('/manager?status=SETTLED&type=PROPERTY&submittedFrom=2026-11-01');
    const req = expectSearch();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('type')).toBe('PROPERTY');
    req.flush(envelope(makePage([])));
    harness.detectChanges();
    expect(byTestId(el(), 'empty-text')?.textContent).toBe('No claims match these filters.');
    expect(byTestId(el(), 'empty-action')?.textContent?.trim()).toBe('Clear filters');
  });

  it('a paginator change calls the API with the new page and size', async () => {
    (await open('/manager')).flush(envelope(makePage([makeSummary()], 0, 20, 57)));
    harness.detectChanges();
    const list = harness.fixture.debugElement.query((d) => d.componentInstance instanceof ClaimListComponent)
      .componentInstance as ClaimListComponent;

    list.onPage({ pageIndex: 2, pageSize: 10, length: 57 });
    await settle();

    expect(router.url).toBe('/manager?page=2&size=10');
    const req = expectSearch();
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(envelope(makePage([makeSummary()], 2, 10, 57)));
  });

  it('a sort change goes back to page 0 with the new sort', async () => {
    (await open('/manager?page=2')).flush(envelope(makePage([makeSummary()], 2, 20, 57)));
    harness.detectChanges();
    const list = harness.fixture.debugElement.query((d) => d.componentInstance instanceof ClaimListComponent)
      .componentInstance as ClaimListComponent;

    list.onSort({ active: 'estimatedAmount', direction: 'asc' });
    await settle();

    expect(router.url).toBe('/manager?sort=estimatedAmount,asc');
    expectSearch().flush(envelope(makePage([])));
  });

  it('an error shows the ErrorPanel and Retry calls the API again', async () => {
    (await open('/manager')).flush(errorEnvelope('INTERNAL_ERROR', 'boom'), { status: 500, statusText: 'err' });
    harness.detectChanges();
    expect(byTestId(el(), 'error-panel')).not.toBeNull();
    expect(byTestId(el(), 'error-text')).toBeNull(); // the interceptor popup is the one message

    byTestId<HTMLButtonElement>(el(), 'retry')!.click();
    expectSearch().flush(envelope(makePage([makeSummary()])));
    harness.detectChanges();
    expect(byTestId(el(), 'error-panel')).toBeNull();
    expect(allByTestId(el(), 'claim-row').length).toBe(1);
  });

  it('a network error shows Retry only, with no text of its own', async () => {
    (await open('/manager')).error(new ProgressEvent('error'), { status: 0 });
    harness.detectChanges();
    expect(byTestId(el(), 'retry')).not.toBeNull();
    expect(byTestId(el(), 'error-text')).toBeNull();
  });

  it('a 403 shows no ErrorPanel (the error interceptor reports it)', async () => {
    (await open('/manager')).flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(byTestId(el(), 'error-panel')).toBeNull();
  });

  it('claimant empty list without filters offers "+ New claim"', async () => {
    (await open('/claimant')).flush(envelope(makePage([])));
    harness.detectChanges();
    expect(byTestId(el(), 'empty-text')?.textContent).toBe("You haven't submitted any claims yet.");
    byTestId<HTMLButtonElement>(el(), 'empty-action')!.click();
    await settle();
    expect(router.url).toBe('/claimant/claims/new');
  });

  it('manager with only SUBMITTED shows the unassigned empty text', async () => {
    (await open('/manager?status=SUBMITTED')).flush(envelope(makePage([])));
    harness.detectChanges();
    expect(byTestId(el(), 'empty-text')?.textContent).toBe('No unassigned claims 🎉');
  });

  it('Clear filters empties the URL and reloads', async () => {
    (await open('/manager?market=SG')).flush(envelope(makePage([])));
    harness.detectChanges();
    byTestId<HTMLButtonElement>(el(), 'empty-action')!.click();
    await settle();
    expect(router.url).toBe('/manager');
    expect(expectSearch().request.params.has('market')).toBeFalse();
  });
});
