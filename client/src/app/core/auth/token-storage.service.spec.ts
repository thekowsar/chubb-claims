import { TestBed } from '@angular/core/testing';
import { makeToken } from '../../testing/test-helpers';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService (T1)', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    service = TestBed.inject(TokenStorageService);
  });

  afterEach(() => sessionStorage.clear());

  it('saves, reads and clears the token in sessionStorage', () => {
    const token = makeToken();
    service.save(token);
    expect(service.get()).toBe(token);
    expect(sessionStorage.getItem(TokenStorageService.KEY)).toBe(token);

    service.clear();
    expect(service.get()).toBeNull();
  });

  it('decodes sub, role and exp from the payload', () => {
    const payload = service.decode(makeToken('MANAGER', 60, '5'));
    expect(payload?.sub).toBe('5');
    expect(payload?.role).toBe('MANAGER');
    expect(payload?.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('reports an unexpired token as valid', () => {
    service.save(makeToken('CLAIMANT', 600));
    expect(service.hasValidToken()).toBeTrue();
    expect(service.validToken()).toBe(service.get());
  });

  it('reports a token with a past exp as expired', () => {
    service.save(makeToken('CLAIMANT', -10));
    expect(service.hasValidToken()).toBeFalse();
    expect(service.validToken()).toBeNull();
  });

  it('treats a malformed token as no token', () => {
    service.save('not-a-jwt');
    expect(service.hasValidToken()).toBeFalse();
    expect(service.decode('a.%%%.c')).toBeNull();
    expect(service.decode(`a.${btoa('{"role":"CLAIMANT"}')}.c`)).toBeNull();
  });

  it('has no valid token when nothing is stored', () => {
    expect(service.hasValidToken()).toBeFalse();
  });
});
