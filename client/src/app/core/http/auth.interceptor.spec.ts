import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { makeToken } from '../../testing/test-helpers';
import { TokenStorageService } from '../auth/token-storage.service';
import { CORRELATION_HEADER, authInterceptor } from './auth.interceptor';

describe('authInterceptor (T4)', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let storage: TokenStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    ctrl.verify();
    sessionStorage.clear();
  });

  it('adds Authorization when a token exists', () => {
    const token = makeToken();
    storage.save(token);
    http.get('/api/menu').subscribe();

    const req = ctrl.expectOne('/api/menu');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush([]);
  });

  it('does not add Authorization to /api/auth/login', () => {
    storage.save(makeToken());
    http.post('/api/auth/login', {}).subscribe();

    const req = ctrl.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does not add Authorization without a token, or with an expired one', () => {
    http.get('/api/menu').subscribe();
    expect(ctrl.expectOne('/api/menu').request.headers.has('Authorization')).toBeFalse();

    storage.save(makeToken('CLAIMANT', -1));
    http.get('/api/auth/me').subscribe();
    expect(ctrl.expectOne('/api/auth/me').request.headers.has('Authorization')).toBeFalse();
  });

  it('always adds a fresh X-Correlation-Id to /api calls', () => {
    http.post('/api/auth/login', {}).subscribe();
    http.get('/api/menu').subscribe();

    const a = ctrl.expectOne('/api/auth/login').request.headers.get(CORRELATION_HEADER);
    const b = ctrl.expectOne('/api/menu').request.headers.get(CORRELATION_HEADER);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(b).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });

  it('leaves non-API requests alone', () => {
    storage.save(makeToken());
    http.get('/assets/x.json').subscribe();

    const req = ctrl.expectOne('/assets/x.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.headers.has(CORRELATION_HEADER)).toBeFalse();
  });
});
