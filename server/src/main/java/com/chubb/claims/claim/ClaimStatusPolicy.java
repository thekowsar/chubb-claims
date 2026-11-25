package com.chubb.claims.claim;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * The one place that holds the status transition table (02 §2). Anything not listed is 409
 * INVALID_STATUS_TRANSITION. SETTLED and REJECTED are final.
 */
@Slf4j
@Component
public class ClaimStatusPolicy {

    static final Map<ClaimStatus, Set<ClaimStatus>> ALLOWED = Map.of(
            ClaimStatus.SUBMITTED, Set.of(ClaimStatus.ASSIGNED),
            ClaimStatus.ASSIGNED, Set.of(ClaimStatus.ASSIGNED, ClaimStatus.IN_PROGRESS),
            ClaimStatus.IN_PROGRESS, Set.of(ClaimStatus.SETTLED, ClaimStatus.REJECTED),
            ClaimStatus.SETTLED, Set.of(),
            ClaimStatus.REJECTED, Set.of());

    public boolean isAllowed(ClaimStatus from, ClaimStatus to) {
        return ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }

    public void check(Claim claim, ClaimStatus to) {
        ClaimStatus from = claim.getStatus();
        if (!isAllowed(from, to)) {
            log.warn("Invalid transition id={} from={} to={}", claim.getId(), from, to);
            throw new InvalidStatusTransitionException(from, to);
        }
    }

    /** Assessment keeps the status but is only allowed while IN_PROGRESS (02 P9). */
    public void checkAssessable(Claim claim) {
        if (claim.getStatus() != ClaimStatus.IN_PROGRESS) {
            log.warn("Assessment rejected id={} status={}", claim.getId(), claim.getStatus());
            throw new InvalidStatusTransitionException(
                    "Assessment is only allowed while the claim is IN_PROGRESS, not " + claim.getStatus());
        }
    }
}
