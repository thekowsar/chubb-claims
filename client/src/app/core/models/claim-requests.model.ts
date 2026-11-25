import { ClaimType, Currency, Market } from './claim.model';

/** Request bodies (04-api-spec.yaml). */
export interface CreateClaimRequest {
  type: ClaimType;
  market: Market;
  policyNumber: string;
  incidentDate: string;
  location: string;
  description: string;
  estimatedAmount: number;
  currency?: Currency;
}

export interface AssignClaimRequest {
  staffId: number;
}

export interface AssessClaimRequest {
  assessedAmount: number;
}

export interface SettleClaimRequest {
  settledAmount: number;
  decisionNote: string;
}

export interface RejectClaimRequest {
  decisionNote: string;
}
