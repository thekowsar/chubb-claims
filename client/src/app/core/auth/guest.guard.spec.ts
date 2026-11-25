import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { makeToken } from '../../testing/test-helpers';
import { MenuService } from '../menu/menu.service';
import { AuthService } from './auth.service';
import { guestGuard } from './guest.guard';
import { TokenStorageService } from './token-storage.service';

@Component({ standalone: true, template: 'page' })
class DummyPage {}

describe('guestGuard (T9)', () => {
  const loggedIn = signal(false);
  const home = signal('/claimant/claims');

  beforeEach(() => {
    sessionStorage.clear();
    loggedIn.set(false);
    home.set('/claimant/claims');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', canActivate: [guestGuard], component: DummyPage },
          { path: 'claimant/claims', component: DummyPage },
        ]),
        { provide: AuthService, useValue: { isLoggedIn: loggedIn } },
        { provide: MenuService, useValue: { homeRoute: home } },
      ],
    });
  });

  afterEach(() => sessionStorage.clear());

  it('allows a guest on /login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('redirects a logged-in user to their home page', async () => {
    TestBed.inject(TokenStorageService).save(makeToken());
    loggedIn.set(true);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/claimant/claims');
  });

  it('allows /login when the logged-in user has no menu (no redirect loop)', async () => {
    TestBed.inject(TokenStorageService).save(makeToken());
    loggedIn.set(true);
    home.set('/login');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
