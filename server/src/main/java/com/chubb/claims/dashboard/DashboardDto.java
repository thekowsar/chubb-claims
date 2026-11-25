package com.chubb.claims.dashboard;

import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.claim.Currency;
import com.chubb.claims.claim.Market;
import com.chubb.claims.user.UserRef;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Manager dashboard (04 DashboardDto). Period figures follow `period`; the rest is a snapshot of now. */
@Schema(name = "DashboardDto")
public record DashboardDto(
        DashboardPeriod period,
        @Schema(nullable = true, description = "Window start (UTC). Null for ALL.") Instant periodFrom,
        @Schema(description = "Window end (now)") Instant periodTo,
        @Schema(description = "Claims submitted in the window") long submittedCount,
        ClosedCounts closedCounts,
        @Schema(description = "Claims in SUBMITTED now (snapshot)") long unassignedCount,
        List<StatusCount> countsByStatus,
        List<Workload> workload,
        List<Liability> outstandingLiability,
        List<SettledTotal> settledTotals,
        Instant generatedAt) {

    public record ClosedCounts(long settled, long rejected) {
    }

    public record StatusCount(ClaimStatus status, long count) {
    }

    public record Workload(UserRef staff, long assignedCount, long inProgressCount) {
    }

    public record Liability(Market market, Currency currency, BigDecimal amount, long openClaimCount) {
    }

    public record SettledTotal(Currency currency, BigDecimal amount) {
    }
}
