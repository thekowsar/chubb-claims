package com.chubb.claims.claim.dto;

import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.user.UserRef;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(name = "StatusHistoryDto")
public record StatusHistoryDto(
        @Schema(nullable = true) ClaimStatus fromStatus,
        ClaimStatus toStatus,
        UserRef changedBy,
        @Schema(nullable = true) UserRef assignedStaff,
        Instant changedAt) {
}
