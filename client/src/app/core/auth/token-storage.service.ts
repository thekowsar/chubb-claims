import { Injectable } from '@angular/core';
import { RoleCode } from '../models/user.model';

export interface TokenPayload {
  sub: string;
  username: string;
  role: RoleCode;
  exp: number;
  iat?: number;
}

/**
 * Keeps the JWT in sessionStorage (05 §5.2) and decodes its payload without checking the signature.
 * The server is the real check; this is only for guards and UX.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  static readonly KEY = 'chubb-claims.token';

  save(token: string): void {
    sessionStorage.setItem(TokenStorageService.KEY, token);
  }

  get(): string | null {
    return sessionStorage.getItem(TokenStorageService.KEY);
  }

  clear(): void {
    sessionStorage.removeItem(TokenStorageService.KEY);
  }

  /** The stored token if it decodes and has not expired, otherwise null. */
  validToken(now: number = Date.now()): string | null {
    const token = this.get();
    if (!token) {
      return null;
    }
    const payload = this.decode(token);
    if (!payload || payload.exp * 1000 <= now) {
      return null;
    }
    return token;
  }

  hasValidToken(now: number = Date.now()): boolean {
    return this.validToken(now) !== null;
  }

  decode(token: string): TokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded)) as Partial<TokenPayload>;
      if (typeof payload.exp !== 'number' || typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
        return null;
      }
      return payload as TokenPayload;
    } catch {
      return null;
    }
  }
}
