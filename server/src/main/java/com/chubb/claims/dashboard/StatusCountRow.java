package com.chubb.claims.dashboard;

import com.chubb.claims.claim.ClaimStatus;

/** Projection: claims per status. */
public record StatusCountRow(ClaimStatus status, Long count) {
}
