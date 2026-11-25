import { UserRef } from './user.model';

/** Enums and DTOs for claims (04-api-spec.yaml ClaimSummaryDto, ClaimDetailDto, ClaimSummaryPage). */
export type ClaimStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'SETTLED' | 'REJECTED';
export type ClaimType = 'MOTOR' | 'PROPERTY';
export type Market = 'SG' | 'HK' | 'AU' | 'MY' | 'TH' | 'ID';
export type Currency = 'SGD' | 'HKD' | 'AUD' | 'MYR' | 'THB' | 'IDR';

/** Fixed display order, used by filters, the pie chart and the badge. */
export const CLAIM_STATUSES: readonly ClaimStatus[] = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'SETTLED', 'REJECTED'];
export const CLAIM_TYPES: readonly ClaimType[] = ['MOTOR', 'PROPERTY'];
export const MARKETS: readonly Market[] = ['SG', 'HK', 'AU', 'MY', 'TH', 'ID'];
export const CURRENCIES: readonly Currency[] = ['SGD', 'HKD', 'AUD', 'MYR', 'THB', 'IDR'];

/** Default currency per market (04 CreateClaimRequest.currency). */
export const MARKET_CURRENCY: Record<Market, Currency> = {
  SG: 'SGD',
  HK: 'HKD',
  AU: 'AUD',
  MY: 'MYR',
  TH: 'THB',
  ID: 'IDR',
};

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  SETTLED: 'Settled',
  REJECTED: 'Rejected',
};

/** Same values as the --status-* CSS variables in styles.scss. Charts need real colours, not CSS variables. */
export const STATUS_COLOR: Record<ClaimStatus, string> = {
  SUBMITTED: '#757575',
  ASSIGNED: '#1e88e5',
  IN_PROGRESS: '#fb8c00',
  SETTLED: '#43a047',
  REJECTED: '#e53935',
};

export interface ClaimSummary {
  id: number;
  claimNumber: string;
  type: ClaimType;
  market: Market;
  status: ClaimStatus;
  incidentDate: string;
  estimatedAmount: number;
  currency: Currency;
  claimant: UserRef;
  assignedStaff: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimDetail {
  id: number;
  claimNumber: string;
  type: ClaimType;
  market: Market;
  policyNumber: string;
  incidentDate: string;
  location: string;
  description: string;
  estimatedAmount: number;
  currency: Currency;
  status: ClaimStatus;
  claimant: UserRef;
  assignedStaff: UserRef | null;
  assessedAmount: number | null;
  settledAmount: number | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  startedAt: string | null;
  closedAt: string | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** List filters for GET /api/claims. Dates are YYYY-MM-DD. */
export interface ClaimFilter {
  status: ClaimStatus[];
  market: Market | null;
  type: ClaimType | null;
  submittedFrom: string | null;
  submittedTo: string | null;
}

export interface PageRequest {
  page: number;
  size: number;
  /** `field,asc|desc` */
  sort: string;
}

export const EMPTY_FILTER: ClaimFilter = { status: [], market: null, type: null, submittedFrom: null, submittedTo: null };
export const DEFAULT_PAGE: PageRequest = { page: 0, size: 20, sort: 'createdAt,desc' };

export function isFilterEmpty(f: ClaimFilter): boolean {
  return f.status.length === 0 && !f.market && !f.type && !f.submittedFrom && !f.submittedTo;
}
