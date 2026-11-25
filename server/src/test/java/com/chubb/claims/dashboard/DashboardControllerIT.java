package com.chubb.claims.dashboard;

import com.chubb.claims.support.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.annotation.DirtiesContext;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/dashboard against a fresh seed, checked with the expected figures from 03 §7.3.
 * A new Spring context (and so a new in-memory database) is used, so other tests' claims don't change the numbers.
 */
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DashboardControllerIT extends ApiTestSupport {

    @Test
    @Order(1)
    void allTimeFiguresMatchTheSeed() throws Exception {
        get("/api/dashboard", MANAGER)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.period").value("ALL"))
                .andExpect(jsonPath("$.data.periodFrom").value(nullValue()))
                .andExpect(jsonPath("$.data.periodTo").isNotEmpty())
                .andExpect(jsonPath("$.data.generatedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.submittedCount").value(8))
                .andExpect(jsonPath("$.data.closedCounts.settled").value(2))
                .andExpect(jsonPath("$.data.closedCounts.rejected").value(1))
                .andExpect(jsonPath("$.data.unassignedCount").value(2))
                .andExpect(jsonPath("$.data.countsByStatus[*].status",
                        contains("SUBMITTED", "ASSIGNED", "IN_PROGRESS", "SETTLED", "REJECTED")))
                .andExpect(jsonPath("$.data.countsByStatus[*].count", contains(2, 1, 2, 2, 1)))
                // Workload: staff1 1 ASSIGNED + 1 IN_PROGRESS, staff2 0 + 1
                .andExpect(jsonPath("$.data.workload[*].staff.displayName", contains("Chris Lim", "Dana Ng")))
                .andExpect(jsonPath("$.data.workload[*].assignedCount", contains(1, 0)))
                .andExpect(jsonPath("$.data.workload[*].inProgressCount", contains(1, 1)))
                // Liability: SG 4,500 + 3,000 (estimate), HK 80,000, AU 12,000, MY 5,800 (assessed, not 6,200)
                .andExpect(jsonPath("$.data.outstandingLiability[*].market", contains("SG", "HK", "AU", "MY")))
                .andExpect(jsonPath("$.data.outstandingLiability[*].currency", contains("SGD", "HKD", "AUD", "MYR")))
                .andExpect(jsonPath("$.data.outstandingLiability[*].amount", contains(7500.0, 80000.0, 12000.0, 5800.0)))
                .andExpect(jsonPath("$.data.outstandingLiability[*].openClaimCount", contains(2, 1, 1, 1)))
                .andExpect(jsonPath("$.data.settledTotals[*].currency", contains("SGD", "THB")))
                .andExpect(jsonPath("$.data.settledTotals[*].amount", contains(1800.0, 135000.0)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"WEEK", "MONTH"})
    @Order(2)
    void periodWindowStartsAtTheCalendarBoundaryAndSnapshotFiguresDoNotChange(String period) throws Exception {
        JsonNode all = data(get("/api/dashboard?period=ALL", MANAGER));
        JsonNode windowed = data(get("/api/dashboard?period=" + period, MANAGER).andExpect(status().isOk()));

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate start = period.equals("WEEK")
                ? today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                : today.withDayOfMonth(1);
        assertThat(windowed.get("period").asText()).isEqualTo(period);
        assertThat(Instant.parse(windowed.get("periodFrom").asText()))
                .isEqualTo(start.atStartOfDay(ZoneOffset.UTC).toInstant());

        assertThat(windowed.get("unassignedCount")).isEqualTo(all.get("unassignedCount"));
        assertThat(windowed.get("workload")).isEqualTo(all.get("workload"));
        assertThat(windowed.get("outstandingLiability")).isEqualTo(all.get("outstandingLiability"));
        assertThat(windowed.get("submittedCount").asLong()).isLessThanOrEqualTo(all.get("submittedCount").asLong());
        long byStatus = 0;
        for (JsonNode row : windowed.get("countsByStatus")) {
            byStatus += row.get("count").asLong();
        }
        assertThat(byStatus).isEqualTo(windowed.get("submittedCount").asLong());
    }

    @Test
    @Order(3)
    void invalidPeriodIs400() throws Exception {
        expectError(get("/api/dashboard?period=YEAR", MANAGER), 400, "VALIDATION_FAILED");
        get("/api/dashboard?period=YEAR", MANAGER).andExpect(jsonPath("$.error.details[0].field").value("period"));
    }

    @ParameterizedTest
    @ValueSource(strings = {CLAIMANT1, STAFF1})
    @Order(4)
    void onlyManagerSeesTheDashboard(String username) throws Exception {
        expectError(get("/api/dashboard", username), 403, "ACCESS_DENIED");
    }

    @Test
    @Order(5)
    void withoutTokenIs401() throws Exception {
        expectError(get("/api/dashboard", null), 401, "UNAUTHORIZED");
    }

    @Test
    @Order(10)
    void figuresFollowNewClaimsAndTransitions() throws Exception {
        JsonNode before = data(get("/api/dashboard", MANAGER));
        createClaim(CLAIMANT1);
        long settled = settledClaim(CLAIMANT2, STAFF2);
        JsonNode after = data(get("/api/dashboard", MANAGER));

        assertThat(settled).isPositive();
        assertThat(after.get("submittedCount").asLong()).isEqualTo(before.get("submittedCount").asLong() + 2);
        assertThat(after.get("unassignedCount").asLong()).isEqualTo(before.get("unassignedCount").asLong() + 1);
        assertThat(after.get("closedCounts").get("settled").asLong())
                .isEqualTo(before.get("closedCounts").get("settled").asLong() + 1);
        // The new SG claim (4,500 estimate) adds to SG liability; the settled one is no longer open.
        assertThat(after.at("/outstandingLiability/0/amount").decimalValue())
                .isEqualByComparingTo(before.at("/outstandingLiability/0/amount").decimalValue().add(new java.math.BigDecimal("4500")));
        // settledClaim settles 900.00 in SGD
        assertThat(after.at("/settledTotals/0/amount").decimalValue())
                .isEqualByComparingTo(before.at("/settledTotals/0/amount").decimalValue().add(new java.math.BigDecimal("900")));
    }
}
