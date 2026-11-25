import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MenuService } from '../menu/menu.service';
import { RoleCode } from '../models/user.model';
import { AuthService } from './auth.service';
import { homeRedirectGuard, isAllowedReturnUrl, roleGuard } from './role.guard';

@Component({ standalone: true, template: 'page' })
class DummyPage {}

const HOME: Record<RoleCode, string> = {
  CLAIMANT: '/claimant/claims',
  CLAIMS_STAFF: '/staff/queue',
  MANAGER: '/manager/dashboard',
};

describe('roleGuard (T8)', () => {
  const role = signal<RoleCode | null>(null);
  const loggedIn = signal(false);

  beforeEach(() => {
    role.set(null);
    loggedIn.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: DummyPage },
          { path: 'claimant', canMatch: [roleGuard(['CLAIMANT'])], children: [{ path: 'claims', component: DummyPage }] },
          { path: 'staff', canMatch: [roleGuard(['CLAIMS_STAFF'])], children: [{ path: 'queue', component: DummyPage }] },
          { path: 'manager', canMatch: [roleGuard(['MANAGER'])], children: [{ path: 'dashboard', component: DummyPage }] },
          { path: '**', canActivate: [homeRedirectGuard], children: [] },
        ]),
        { provide: AuthService, useValue: { role, isLoggedIn: loggedIn } },
        { provide: MenuService, useValue: { homeRoute: () => (role() ? HOME[role()!] : '/login') } },
      ],
    });
  });

  const roles: RoleCode[] = ['CLAIMANT', 'CLAIMS_STAFF', 'MANAGER'];
  for (const userRole of roles) {
    for (const targetRole of roles) {
      const allowed = userRole === targetRole;
      it(`${userRole} on ${HOME[targetRole]} is ${allowed ? 'allowed' : 'redirected home'}`, async () => {
        role.set(userRole);
        loggedIn.set(true);
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl(HOME[targetRole]);

        expect(TestBed.inject(Router).url).toBe(allowed ? HOME[targetRole] : HOME[userRole]);
      });
    }
  }

  it('a user without a role is sent to /login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manager/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('homeRedirectGuard sends unknown routes to the home page', async () => {
    role.set('MANAGER');
    loggedIn.set(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/does/not/exist');
    expect(TestBed.inject(Router).url).toBe('/manager/dashboard');
  });
});

describe('isAllowedReturnUrl', () => {
  it('accepts paths inside the role prefix only', () => {
    expect(isAllowedReturnUrl('/claimant/claims', 'CLAIMANT')).toBeTrue();
    expect(isAllowedReturnUrl('/claimant', 'CLAIMANT')).toBeTrue();
    expect(isAllowedReturnUrl('/manager/claims', 'CLAIMANT')).toBeFalse();
    expect(isAllowedReturnUrl('/claimantx', 'CLAIMANT')).toBeFalse();
  });

  it('rejects external, protocol-relative and empty URLs', () => {
    expect(isAllowedReturnUrl('https://evil.example/claimant', 'CLAIMANT')).toBeFalse();
    expect(isAllowedReturnUrl('//evil.example/claimant', 'CLAIMANT')).toBeFalse();
    expect(isAllowedReturnUrl(null, 'CLAIMANT')).toBeFalse();
    expect(isAllowedReturnUrl('/claimant/claims', null)).toBeFalse();
  });
});
