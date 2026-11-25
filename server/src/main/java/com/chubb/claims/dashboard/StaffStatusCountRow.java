package com.chubb.claims.dashboard;

import com.chubb.claims.claim.ClaimStatus;

/** Projection: open claims per assigned staff member and status. */
public record StaffStatusCountRow(Long staffId, ClaimStatus status, Long count) {
}
