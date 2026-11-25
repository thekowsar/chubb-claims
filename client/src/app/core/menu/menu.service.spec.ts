import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MENUS } from '../../testing/test-helpers';
import { MenuService } from './menu.service';

describe('MenuService (T3)', () => {
  let service: MenuService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MenuService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('load sets the menu from GET /api/menu in API order', () => {
    let result: unknown;
    service.load().subscribe((items) => (result = items));

    const req = http.expectOne('/api/menu');
    expect(req.request.method).toBe('GET');
    req.flush(MENUS.MANAGER);

    expect(result).toEqual(MENUS.MANAGER);
    expect(service.menu().map((m) => m.code)).toEqual(['DASHBOARD', 'ALL_CLAIMS']);
  });

  it('homeRoute is the first item route', () => {
    service.load().subscribe();
    http.expectOne('/api/menu').flush(MENUS.CLAIMANT);
    expect(service.homeRoute()).toBe('/claimant/claims');
  });

  it('an empty menu falls back to /login', () => {
    service.load().subscribe();
    http.expectOne('/api/menu').flush([]);
    expect(service.menu()).toEqual([]);
    expect(service.homeRoute()).toBe('/login');
  });

  it('clear empties the menu', () => {
    service.load().subscribe();
    http.expectOne('/api/menu').flush(MENUS.CLAIMS_STAFF);
    service.clear();
    expect(service.menu()).toEqual([]);
  });
});
