import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MENUS, USERS, makeToken } from '../../testing/test-helpers';
import { MenuService } from '../menu/menu.service';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthService (T2)', () => {
  let service: AuthService;
  let storage: TokenStorageService;
  let menu: MenuService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    storage = TestBed.inject(TokenStorageService);
    menu = TestBed.inject(MenuService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('login stores the token, sets currentUser and loads the menu', () => {
    const token = makeToken('MANAGER');
    let loggedIn: unknown;
    service.login({ username: 'manager1', password: 'pw' }).subscribe((u) => (loggedIn = u));

    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'manager1', password: 'pw' });
    req.flush({ token, tokenType: 'Bearer', expiresIn: 3600, user: USERS.MANAGER });

    http.expectOne('/api/menu').flush(MENUS.MANAGER);

    expect(storage.get()).toBe(token);
    expect(service.currentUser()).toEqual(USERS.MANAGER);
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.role()).toBe('MANAGER');
    expect(menu.homeRoute()).toBe('/manager/dashboard');
    expect(loggedIn).toEqual(USERS.MANAGER);
  });

  it('a failed login leaves the state empty', () => {
    let failed = false;
    service.login({ username: 'x', password: 'y' }).subscribe({ error: () => (failed = true) });

    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBeTrue();
    expect(storage.get()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('logout clears storage, user and menu', () => {
    storage.save(makeToken());
    service.login({ username: 'claimant1', password: 'pw' }).subscribe();
    http.expectOne('/api/auth/login').flush({ token: makeToken(), tokenType: 'Bearer', expiresIn: 3600, user: USERS.CLAIMANT });
    http.expectOne('/api/menu').flush(MENUS.CLAIMANT);

    service.logout();

    expect(storage.get()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(menu.menu()).toEqual([]);
  });

  it('restoreSession with a valid token calls /me then /menu', () => {
    storage.save(makeToken('CLAIMS_STAFF'));
    let restored: unknown;
    service.restoreSession().subscribe((u) => (restored = u));

    http.expectOne('/api/auth/me').flush(USERS.CLAIMS_STAFF);
    http.expectOne('/api/menu').flush(MENUS.CLAIMS_STAFF);

    expect(restored).toEqual(USERS.CLAIMS_STAFF);
    expect(service.currentUser()).toEqual(USERS.CLAIMS_STAFF);
    expect(menu.homeRoute()).toBe('/staff/queue');
  });

  it('restoreSession without a token calls nothing', () => {
    let restored: unknown = 'unset';
    service.restoreSession().subscribe((u) => (restored = u));

    http.expectNone('/api/auth/me');
    expect(restored).toBeNull();
  });

  it('restoreSession with an expired token clears it and calls nothing', () => {
    storage.save(makeToken('CLAIMANT', -5));
    service.restoreSession().subscribe();

    http.expectNone('/api/auth/me');
    expect(storage.get()).toBeNull();
  });

  it('restoreSession logs out and completes with null when /me fails', () => {
    storage.save(makeToken());
    let restored: unknown = 'unset';
    service.restoreSession().subscribe((u) => (restored = u));

    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(restored).toBeNull();
    expect(storage.get()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
  });
});
