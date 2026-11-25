import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { apiEnvelopeInterceptor } from '../core/http/api-envelope.interceptor';
import type { ClaimDetail, ClaimSummary, Page } from '../core/models/claim.model';
import type { Dashboard } from '../core/models/dashboard.model';
import type { StatusHistory } from '../core/models/history.model';
import type { Message } from '../core/models/message.model';
import { MenuItem } from '../core/models/menu.model';
import { RoleCode, User } from '../core/models/user.model';

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Unsigned JWT-shaped token for client tests. The client never checks the signature. */
export function makeToken(role: RoleCode = 'CLAIMANT', expInSeconds = 3600, sub = '1'): string {
  const exp = Math.floor(Date.now() / 1000) + expInSeconds;
  return `${base64Url({ alg: 'HS256' })}.${base64Url({ sub, username: 'user', role, exp })}.signature`;
}

export const USERS: Record<RoleCode, User> = {
  CLAIMANT: { id: 1, username: 'claimant1', displayName: 'Alice Tan', role: 'CLAIMANT' },
  CLAIMS_STAFF: { id: 3, username: 'staff1', displayName: 'Chris Lim', role: 'CLAIMS_STAFF' },
  MANAGER: { id: 5, username: 'manager1', displayName: 'Evan Lee', role: 'MANAGER' },
};

export const MENUS: Record<RoleCode, MenuItem[]> = {
  CLAIMANT: [
    { code: 'MY_CLAIMS', label: 'My claims', route: '/claimant/claims', icon: 'list', sortOrder: 10 },
    { code: 'NEW_CLAIM', label: 'New claim', route: '/claimant/claims/new', icon: 'add', sortOrder: 20 },
  ],
  CLAIMS_STAFF: [{ code: 'MY_QUEUE', label: 'My work queue', route: '/staff/queue', icon: 'inbox', sortOrder: 10 }],
  MANAGER: [
    { code: 'DASHBOARD', label: 'Dashboard', route: '/manager/dashboard', icon: 'dashboard', sortOrder: 10 },
    { code: 'ALL_CLAIMS', label: 'All claims', route: '/manager/claims', icon: 'list', sortOrder: 20 },
  ],
};

export function envelope<T>(data: T) {
  return { success: true, data, error: null, timestamp: '2026-11-25T09:30:00Z' };
}

export function errorEnvelope(code: string, message: string, details: { field: string | null; message: string }[] = []) {
  return { success: false, data: null, error: { code, message, details }, timestamp: '2026-11-25T09:30:00Z' };
}

// ---------- Claim fixtures (shapes from 04-api-spec.yaml examples) ----------

export function makeClaim(overrides: Partial<ClaimDetail> = {}): ClaimDetail {
  return {
    id: 4,
    claimNumber: 'CLM-2026-000004',
    type: 'MOTOR',
    market: 'MY',
    policyNumber: 'POL-MY-1',
    incidentDate: '2026-11-10',
    location: 'Kuala Lumpur',
    description: 'Rear bumper damaged in a car park.',
    estimatedAmount: 6200,
    currency: 'MYR',
    status: 'IN_PROGRESS',
    claimant: { id: 2, displayName: 'Ben Wong' },
    assignedStaff: { id: 3, displayName: 'Chris Lim' },
    assessedAmount: 5800,
    settledAmount: null,
    decisionNote: null,
    createdAt: '2026-11-11T02:15:00Z',
    updatedAt: '2026-11-20T08:00:00Z',
    assignedAt: '2026-11-12T01:00:00Z',
    startedAt: '2026-11-13T01:00:00Z',
    closedAt: null,
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<ClaimSummary> = {}): ClaimSummary {
  return {
    id: 4,
    claimNumber: 'CLM-2026-000004',
    type: 'MOTOR',
    market: 'MY',
    status: 'IN_PROGRESS',
    incidentDate: '2026-11-10',
    estimatedAmount: 6200,
    currency: 'MYR',
    claimant: { id: 2, displayName: 'Ben Wong' },
    assignedStaff: { id: 3, displayName: 'Chris Lim' },
    createdAt: '2026-11-11T02:15:00Z',
    updatedAt: '2026-11-20T08:00:00Z',
    ...overrides,
  };
}

export function makePage<T>(items: T[], page = 0, size = 20, totalElements = items.length): Page<T> {
  return { items, page, size, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)) };
}

export function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    author: { id: 3, displayName: 'Chris Lim' },
    authorRole: 'CLAIMS_STAFF',
    body: 'Please send the workshop quote ref.',
    createdAt: '2026-11-18T03:00:00Z',
    ...overrides,
  };
}

export function makeHistory(): StatusHistory[] {
  return [
    { fromStatus: null, toStatus: 'SUBMITTED', changedBy: { id: 2, displayName: 'Ben Wong' }, assignedStaff: null, changedAt: '2026-11-11T02:15:00Z' },
    {
      fromStatus: 'SUBMITTED',
      toStatus: 'ASSIGNED',
      changedBy: { id: 5, displayName: 'Evan Lee' },
      assignedStaff: { id: 3, displayName: 'Chris Lim' },
      changedAt: '2026-11-12T01:00:00Z',
    },
  ];
}

export function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    period: 'ALL',
    periodFrom: null,
    periodTo: '2026-11-25T09:30:00Z',
    submittedCount: 8,
    closedCounts: { settled: 2, rejected: 1 },
    unassignedCount: 2,
    countsByStatus: [
      { status: 'SUBMITTED', count: 2 },
      { status: 'ASSIGNED', count: 1 },
      { status: 'IN_PROGRESS', count: 2 },
      { status: 'SETTLED', count: 2 },
      { status: 'REJECTED', count: 1 },
    ],
    workload: [
      { staff: { id: 3, displayName: 'Chris Lim' }, assignedCount: 1, inProgressCount: 1 },
      { staff: { id: 4, displayName: 'Dana Ng' }, assignedCount: 0, inProgressCount: 1 },
    ],
    outstandingLiability: [
      { market: 'SG', currency: 'SGD', amount: 7500, openClaimCount: 2 },
      { market: 'HK', currency: 'HKD', amount: 80000, openClaimCount: 1 },
    ],
    settledTotals: [
      { currency: 'THB', amount: 135000 },
      { currency: 'SGD', amount: 1800 },
    ],
    generatedAt: '2026-11-25T09:30:00Z',
    ...overrides,
  };
}

/** Finds an element by data-testid inside a fixture's root. */
export function byTestId<T extends HTMLElement = HTMLElement>(root: HTMLElement, id: string): T | null {
  return root.querySelector<T>(`[data-testid="${id}"]`);
}

export function allByTestId<T extends HTMLElement = HTMLElement>(root: HTMLElement, id: string): T[] {
  return Array.from(root.querySelectorAll<T>(`[data-testid="${id}"]`));
}

/** HttpClient with the envelope interceptor, so specs flush real envelopes and get AppError on failure. */
export function provideApiTesting() {
  return [provideHttpClient(withInterceptors([apiEnvelopeInterceptor])), provideHttpClientTesting()];
}
