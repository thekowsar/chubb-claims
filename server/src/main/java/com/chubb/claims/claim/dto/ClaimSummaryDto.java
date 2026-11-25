package com.chubb.claims.claim.dto;

import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.claim.ClaimType;
import com.chubb.claims.claim.Currency;
import com.chubb.claims.claim.Market;
import com.chubb.claims.user.UserRef;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Row in a claim list. */
@Schema(name = "ClaimSummaryDto")
public record ClaimSummaryDto(
        Long id,
        @Schema(example = "CLM-2026-000004") String claimNumber,
        ClaimType type,
        Market market,
        ClaimStatus status,
        LocalDate incidentDate,
        BigDecimal estimatedAmount,
        Currency currency,
        UserRef claimant,
        @Schema(nullable = true) UserRef assignedStaff,
        @Schema(description = "Submitted date") Instant createdAt,
        Instant updatedAt) {
}
