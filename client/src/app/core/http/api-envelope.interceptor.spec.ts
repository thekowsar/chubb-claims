import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { envelope, errorEnvelope } from '../../testing/test-helpers';
import { apiEnvelopeInterceptor } from './api-envelope.interceptor';
import { AppError, NETWORK_ERROR } from './app-error';

describe('apiEnvelopeInterceptor (T5)', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiEnvelopeInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('a success envelope gives just data', () => {
    let body: unknown;
    http.get('/api/auth/me').subscribe((b) => (body = b));
    ctrl.expectOne('/api/auth/me').flush(envelope({ id: 1, username: 'claimant1' }));
    expect(body).toEqual({ id: 1, username: 'claimant1' });
  });

  it('an error envelope becomes AppError with code, message and details', () => {
    let error: AppError | undefined;
    http.post('/api/auth/login', {}).subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('/api/auth/login').flush(
      errorEnvelope('VALIDATION_FAILED', 'Request validation failed', [{ field: 'username', message: 'must not be blank' }]),
      { status: 400, statusText: 'Bad Request', headers: new HttpHeaders({ 'X-Correlation-Id': 'corr-1' }) },
    );

    expect(error).toEqual(jasmine.any(AppError));
    expect(error?.status).toBe(400);
    expect(error?.code).toBe('VALIDATION_FAILED');
    expect(error?.message).toBe('Request validation failed');
    expect(error?.details).toEqual([{ field: 'username', message: 'must not be blank' }]);
    expect(error?.correlationId).toBe('corr-1');
  });

  it('a non-envelope error body becomes INTERNAL_ERROR', () => {
    let error: AppError | undefined;
    http.get('/api/menu').subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('/api/menu').flush('<html>gateway</html>', { status: 502, statusText: 'Bad Gateway' });

    expect(error?.status).toBe(502);
    expect(error?.code).toBe('INTERNAL_ERROR');
  });

  it('status 0 becomes NETWORK_ERROR', () => {
    let error: AppError | undefined;
    http.get('/api/menu').subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('/api/menu').error(new ProgressEvent('error'), { status: 0 });

    expect(error?.status).toBe(0);
    expect(error?.code).toBe(NETWORK_ERROR);
  });

  it('leaves non-API responses untouched', () => {
    let body: unknown;
    http.get('/assets/config.json').subscribe((b) => (body = b));
    ctrl.expectOne('/assets/config.json').flush(envelope('x'));
    expect(body).toEqual(envelope('x'));
  });
});
