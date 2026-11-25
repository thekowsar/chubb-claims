package com.chubb.claims.claim;

import java.util.Set;

/** Claim lifecycle (02 §2). Stored as VARCHAR, never ordinal. */
public enum ClaimStatus {
    SUBMITTED,
    ASSIGNED,
    IN_PROGRESS,
    SETTLED,
    REJECTED;

    /** Open claims count towards liability and workload (01 §5.3). */
    public static final Set<ClaimStatus> OPEN = Set.of(SUBMITTED, ASSIGNED, IN_PROGRESS);
    public static final Set<ClaimStatus> CLOSED = Set.of(SETTLED, REJECTED);
}
