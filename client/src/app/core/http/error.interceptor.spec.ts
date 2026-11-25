import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { errorEnvelope } from '../../testing/test-helpers';
import { AuthService } from '../auth/auth.service';
import { MenuService } from '../menu/menu.service';
import { NotifyService } from '../notify/notify.service';
import { FORBIDDEN_DEDUPE_MS, ForbiddenNotice, ServerErrorNotice, errorInterceptor } from './error.interceptor';

describe('errorInterceptor (T6)', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let notify: jasmine.SpyObj<NotifyService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    notify = jasmine.createSpyObj<NotifyService>('NotifyService', ['error', 'success']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], { url: '/manager/claims' });
    router.navigate.and.resolveTo(true);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: NotifyService, useValue: notify },
        { provide: Router, useValue: router },
        { provide: MenuService, useValue: { homeRoute: () => '/manager/dashboard' } },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  function fail(url: string, status: number, code = 'X'): HttpErrorResponse | undefined {
    let error: HttpErrorResponse | undefined;
    http.get(url).subscribe({ error: (e) => (error = e) });
    ctrl.expectOne(url).flush(errorEnvelope(code, 'msg'), { status, statusText: 'err' });
    return error;
  }

  it('401 on a normal call logs out and goes to /login with returnUrl', () => {
    const error = fail('/api/menu', 401, 'UNAUTHORIZED');

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/manager/claims' } });
    expect(notify.error).toHaveBeenCalledWith('Your session has expired. Please log in again.');
    expect(error?.status).toBe(401);
  });

  it('401 on login is passed through', () => {
    let error: HttpErrorResponse | undefined;
    http.post('/api/auth/login', {}).subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('/api/auth/login').flush(errorEnvelope('INVALID_CREDENTIALS', 'x'), { status: 401, statusText: 'x' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('403 shows a snackbar and goes home', () => {
    fail('/api/menu', 403, 'ACCESS_DENIED');

    expect(notify.error).toHaveBeenCalledWith("You don't have access to that.");
    expect(router.navigateByUrl).toHaveBeenCalledWith('/manager/dashboard');
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('three parallel 403s show one message and navigate home once', () => {
    const urls = ['/api/claims/5', '/api/claims/5/messages', '/api/claims/5/history'];
    for (const url of urls) {
      http.get(url).subscribe({ error: () => undefined });
    }
    for (const url of urls) {
      ctrl.expectOne(url).flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    }

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });

  it('every 403 is still rethrown to the caller, even when its message is skipped', () => {
    let errors = 0;
    http.get('/api/a').subscribe({ error: () => errors++ });
    http.get('/api/b').subscribe({ error: () => errors++ });
    ctrl.expectOne('/api/a').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    ctrl.expectOne('/api/b').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    expect(errors).toBe(2);
    expect(notify.error).toHaveBeenCalledTimes(1);
  });

  it('ForbiddenNotice allows a new message once the burst window has passed', () => {
    const notice = TestBed.inject(ForbiddenNotice);
    expect(notice.shouldShow(1000)).toBeTrue();
    expect(notice.shouldShow(1000 + FORBIDDEN_DEDUPE_MS - 1)).toBeFalse();
    expect(notice.shouldShow(1000 + FORBIDDEN_DEDUPE_MS)).toBeTrue();
  });

  it('500 shows a snackbar', () => {
    fail('/api/menu', 500, 'INTERNAL_ERROR');
    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(notify.error.calls.mostRecent().args[0]).toContain('Something went wrong');
  });

  it('500 popup carries the reference id from the response header', () => {
    http.get('/api/claims').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/claims').flush(errorEnvelope('INTERNAL_ERROR', 'x'), {
      status: 500,
      statusText: 'err',
      headers: { 'X-Correlation-Id': 'corr-500' },
    });
    expect(notify.error).toHaveBeenCalledOnceWith('Something went wrong. Please try again. Reference: corr-500');
  });

  it('a burst of parallel 500s shows exactly one popup, and every caller still gets its error', () => {
    const urls = ['/api/claims', '/api/dashboard', '/api/users'];
    let errors = 0;
    for (const url of urls) {
      http.get(url).subscribe({ error: () => errors++ });
    }
    for (const url of urls) {
      ctrl.expectOne(url).flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
    }
    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(errors).toBe(3);
  });

  it('a burst of parallel network errors shows exactly one popup', () => {
    const urls = ['/api/claims', '/api/dashboard', '/api/users'];
    for (const url of urls) {
      http.get(url).subscribe({ error: () => undefined });
    }
    for (const url of urls) {
      ctrl.expectOne(url).error(new ProgressEvent('error'), { status: 0 });
    }
    expect(notify.error).toHaveBeenCalledTimes(1);
  });

  it('a mixed burst of 500, 503 and network errors shows exactly one popup', () => {
    http.get('/api/a').subscribe({ error: () => undefined });
    http.get('/api/b').subscribe({ error: () => undefined });
    http.get('/api/c').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/a').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
    ctrl.expectOne('/api/b').flush('busy', { status: 503, statusText: 'Unavailable' });
    ctrl.expectOne('/api/c').error(new ProgressEvent('error'), { status: 0 });
    expect(notify.error).toHaveBeenCalledTimes(1);
  });

  it('server-error and access-denied bursts are counted separately', () => {
    http.get('/api/a').subscribe({ error: () => undefined });
    http.get('/api/b').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/a').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    ctrl.expectOne('/api/b').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
    expect(notify.error.calls.allArgs().map((a) => a[0].split('.')[0])).toEqual(["You don't have access to that", 'Something went wrong']);
  });

  it('ServerErrorNotice allows a new popup once the burst window has passed', () => {
    const notice = TestBed.inject(ServerErrorNotice);
    expect(notice.shouldShow(5000)).toBeTrue();
    expect(notice.shouldShow(5000 + FORBIDDEN_DEDUPE_MS - 1)).toBeFalse();
    expect(notice.shouldShow(5000 + FORBIDDEN_DEDUPE_MS)).toBeTrue();
  });

  it('status 0 shows a snackbar', () => {
    http.get('/api/menu').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/menu').error(new ProgressEvent('error'), { status: 0 });
    expect(notify.error).toHaveBeenCalled();
  });

  for (const status of [400, 404, 409]) {
    it(`${status} is passed through untouched`, () => {
      const error = fail('/api/menu', status);

      expect(error?.status).toBe(status);
      expect(notify.error).not.toHaveBeenCalled();
      expect(auth.logout).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  }
});
