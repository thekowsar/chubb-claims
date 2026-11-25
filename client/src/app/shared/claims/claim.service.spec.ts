import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PAGE, EMPTY_FILTER } from '../../core/models/claim.model';
import { makeClaim } from '../../testing/test-helpers';
import { ClaimService } from './claim.service';

describe('ClaimService (T10)', () => {
  let service: ClaimService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ClaimService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('search with no filters sends only page, size and sort', () => {
    service.search(EMPTY_FILTER, DEFAULT_PAGE).subscribe();
    const req = http.expectOne((r) => r.url === '/api/claims');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('createdAt,desc');
  });

  it('search repeats status and adds every set filter', () => {
    service
      .search(
        { status: ['ASSIGNED', 'IN_PROGRESS'], market: 'SG', type: 'MOTOR', submittedFrom: '2026-11-01', submittedTo: '2026-11-30' },
        { page: 2, size: 50, sort: 'claimNumber,asc' },
      )
      .subscribe();
    const req = http.expectOne((r) => r.url === '/api/claims');
    expect(req.request.urlWithParams).toBe(
      '/api/claims?status=ASSIGNED&status=IN_PROGRESS&market=SG&type=MOTOR&submittedFrom=2026-11-01&submittedTo=2026-11-30&page=2&size=50&sort=claimNumber,asc',
    );
  });

  it('get, history and create use the right method and URL', () => {
    service.get(4).subscribe();
    service.history(4).subscribe();
    const body = {
      type: 'MOTOR' as const,
      market: 'SG' as const,
      policyNumber: 'P',
      incidentDate: '2026-11-20',
      location: 'L',
      description: 'Ten chars!!',
      estimatedAmount: 1,
      currency: 'SGD' as const,
    };
    service.create(body).subscribe();

    expect(http.expectOne('/api/claims/4').request.method).toBe('GET');
    expect(http.expectOne('/api/claims/4/history').request.method).toBe('GET');
    const create = http.expectOne((r) => r.url === '/api/claims' && r.method === 'POST');
    expect(create.request.body).toEqual(body);
  });

  it('workflow actions call the right method, URL and body', () => {
    let result: unknown;
    service.assign(4, 3).subscribe((c) => (result = c));
    service.start(4).subscribe();
    service.assess(4, { assessedAmount: 5800 }).subscribe();
    service.settle(4, { settledAmount: 5500, decisionNote: 'ok' }).subscribe();
    service.reject(4, { decisionNote: 'no' }).subscribe();

    const assign = http.expectOne('/api/claims/4/assignment');
    expect(assign.request.method).toBe('PUT');
    expect(assign.request.body).toEqual({ staffId: 3 });
    assign.flush(makeClaim({ status: 'ASSIGNED' }));
    expect((result as { status: string }).status).toBe('ASSIGNED');

    const start = http.expectOne('/api/claims/4/start');
    expect(start.request.method).toBe('POST');
    expect(start.request.body).toBeNull();

    const assess = http.expectOne('/api/claims/4/assessment');
    expect(assess.request.method).toBe('PATCH');
    expect(assess.request.body).toEqual({ assessedAmount: 5800 });

    const settle = http.expectOne('/api/claims/4/settle');
    expect(settle.request.method).toBe('POST');
    expect(settle.request.body).toEqual({ settledAmount: 5500, decisionNote: 'ok' });

    const reject = http.expectOne('/api/claims/4/reject');
    expect(reject.request.method).toBe('POST');
    expect(reject.request.body).toEqual({ decisionNote: 'no' });
  });
});
