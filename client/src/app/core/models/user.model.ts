export type RoleCode = 'CLAIMANT' | 'CLAIMS_STAFF' | 'MANAGER';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: RoleCode;
}

export interface UserRef {
  id: number;
  displayName: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

/** URL prefix each role may use. Matches the lazy route prefixes in app.routes.ts. */
export const ROLE_PREFIX: Record<RoleCode, string> = {
  CLAIMANT: '/claimant',
  CLAIMS_STAFF: '/staff',
  MANAGER: '/manager',
};
