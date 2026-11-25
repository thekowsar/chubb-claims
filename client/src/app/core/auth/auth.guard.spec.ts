import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { makeToken } from '../../testing/test-helpers';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

@Component({ standalone: true, template: 'page' })
class DummyPage {}

describe('authGuard (T7)', () => {
  const loggedIn = signal(false);
  let logout: jasmine.Spy;
  let storage: TokenStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    loggedIn.set(false);
    logout = jasmine.createSpy('logout');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: DummyPage },
          { path: 'claimant/claims', canActivate: [authGuard], component: DummyPage },
          { path: 'staff', canMatch: [authGuard], children: [{ path: 'queue', component: DummyPage }] },
        ]),
        { provide: AuthService, useValue: { isLoggedIn: loggedIn, logout } },
      ],
    });
    storage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => sessionStorage.clear());

  it('allows a logged-in user with a valid token', async () => {
    storage.save(makeToken());
    loggedIn.set(true);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/claimant/claims');

    expect(TestBed.inject(Router).url).toBe('/claimant/claims');
    expect(logout).not.toHaveBeenCalled();
  });

  it('redirects to /login with returnUrl when there is no token', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/claimant/claims');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fclaimant%2Fclaims');
  });

  it('logs out and redirects when the token is expired', async () => {
    storage.save(makeToken('CLAIMANT', -30));
    loggedIn.set(true);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/claimant/claims');

    expect(logout).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toContain('/login');
  });

  it('works as canMatch too', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/staff/queue');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fstaff%2Fqueue');
  });
});
