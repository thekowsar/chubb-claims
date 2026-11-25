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

@Schema(name = "ClaimDetailDto")
public record ClaimDetailDto(
        Long id,
        String claimNumber,
        ClaimType type,
        Market market,
        String policyNumber,
        LocalDate incidentDate,
        String location,
        String description,
        BigDecimal estimatedAmount,
        Currency currency,
        ClaimStatus status,
        UserRef claimant,
        @Schema(nullable = true) UserRef assignedStaff,
        @Schema(nullable = true) BigDecimal assessedAmount,
        @Schema(nullable = true) BigDecimal settledAmount,
        @Schema(nullable = true) String decisionNote,
        Instant createdAt,
        Instant updatedAt,
        @Schema(nullable = true) Instant assignedAt,
        @Schema(nullable = true) Instant startedAt,
        @Schema(nullable = true) Instant closedAt) {

    @Override
    public String toString() {
        return "ClaimDetailDto[id=" + id + ", status=" + status + "]";
    }
}
