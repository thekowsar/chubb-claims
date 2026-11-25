import { ClaimStatus, Currency, Market } from './claim.model';
import { UserRef } from './user.model';

/** DashboardDto (04-api-spec.yaml). Period rules: 04-api-summary "Dashboard period". */
export type DashboardPeriod = 'WEEK' | 'MONTH' | 'ALL';

export interface StatusCount {
  status: ClaimStatus;
  count: number;
}

export interface StaffWorkload {
  staff: UserRef;
  assignedCount: number;
  inProgressCount: number;
}

export interface LiabilityRow {
  market: Market;
  currency: Currency;
  amount: number;
  openClaimCount: number;
}

export interface CurrencyTotal {
  currency: Currency;
  amount: number;
}

export interface Dashboard {
  period: DashboardPeriod;
  periodFrom: string | null;
  periodTo: string;
  submittedCount: number;
  closedCounts: { settled: number; rejected: number };
  unassignedCount: number;
  countsByStatus: StatusCount[];
  workload: StaffWorkload[];
  outstandingLiability: LiabilityRow[];
  settledTotals: CurrencyTotal[];
  generatedAt: string;
}
