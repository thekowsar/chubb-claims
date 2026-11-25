import { ClaimStatus } from './claim.model';
import { UserRef } from './user.model';

/** StatusHistoryDto (04-api-spec.yaml), one row of the claim timeline. */
export interface StatusHistory {
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  changedBy: UserRef;
  assignedStaff: UserRef | null;
  changedAt: string;
}
