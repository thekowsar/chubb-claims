import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService (T11)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  for (const period of ['WEEK', 'MONTH', 'ALL'] as const) {
    it(`get sends period=${period}`, () => {
      TestBed.inject(DashboardService).get(period).subscribe();
      expect(http.expectOne(`/api/dashboard?period=${period}`).request.method).toBe('GET');
    });
  }
});
