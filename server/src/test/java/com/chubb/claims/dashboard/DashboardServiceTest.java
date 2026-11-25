package com.chubb.claims.dashboard;

import com.chubb.claims.claim.ClaimRepository;
import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.claim.Currency;
import com.chubb.claims.claim.Market;
import com.chubb.claims.support.TestData;
import com.chubb.claims.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DashboardServiceTest {

    /** A Wednesday. */
    private static final Instant NOW = Instant.parse("2026-11-25T09:30:00Z");

    @Mock
    private ClaimRepository claimRepository;
    @Mock
    private UserRepository userRepository;

    private DashboardService service;

    @BeforeEach
    void setUp() {
        service = new DashboardService(claimRepository, userRepository, Clock.fixed(NOW, ZoneOffset.UTC));
        when(userRepository.findByRoleCodeAndEnabledTrueOrderByDisplayNameAsc("CLAIMS_STAFF"))
                .thenReturn(List.of(TestData.staff1(), TestData.staff2()));
        when(claimRepository.countByStatusSubmittedSince(any())).thenReturn(List.of(
                new StatusCountRow(ClaimStatus.SUBMITTED, 2L), new StatusCountRow(ClaimStatus.SETTLED, 2L)));
        when(claimRepository.countSubmittedSince(any())).thenReturn(4L);
        when(claimRepository.countClosedSince(anyCollection(), any())).thenReturn(List.of(
                new StatusCountRow(ClaimStatus.SETTLED, 2L)));
        when(claimRepository.countByStatus(ClaimStatus.SUBMITTED)).thenReturn(2L);
        when(claimRepository.countByStaffAndStatus(anyCollection())).thenReturn(List.of(
                new StaffStatusCountRow(3L, ClaimStatus.ASSIGNED, 1L),
                new StaffStatusCountRow(3L, ClaimStatus.IN_PROGRESS, 1L)));
        when(claimRepository.outstandingLiability(anyCollection())).thenReturn(List.of(
                new LiabilityRow(Market.MY, Currency.MYR, new BigDecimal("5800.00"), 1L),
                new LiabilityRow(Market.SG, Currency.SGD, new BigDecimal("7500.00"), 2L)));
        when(claimRepository.settledTotalsSince(any())).thenReturn(List.of(
                new CurrencyAmountRow(Currency.THB, new BigDecimal("135000.00")),
                new CurrencyAmountRow(Currency.SGD, new BigDecimal("1800.00"))));
    }

    @Test
    void allPeriodHasNoStartAndQueriesFromEpoch() {
        DashboardDto dto = service.get(DashboardPeriod.ALL);

        assertThat(dto.period()).isEqualTo(DashboardPeriod.ALL);
        assertThat(dto.periodFrom()).isNull();
        assertThat(dto.periodTo()).isEqualTo(NOW);
        assertThat(dto.generatedAt()).isEqualTo(NOW);
        verify(claimRepository).countSubmittedSince(Instant.EPOCH);
        verify(claimRepository).settledTotalsSince(Instant.EPOCH);
    }

    @Test
    void weekStartsMondayMidnightUtc() {
        DashboardDto dto = service.get(DashboardPeriod.WEEK);

        Instant monday = Instant.parse("2026-11-23T00:00:00Z");
        assertThat(dto.periodFrom()).isEqualTo(monday);
        verify(claimRepository).countByStatusSubmittedSince(monday);
        verify(claimRepository).countClosedSince(eq(ClaimStatus.CLOSED), eq(monday));
    }

    @Test
    void countsByStatusListsEveryStatusInOrderWithZeros() {
        DashboardDto dto = service.get(DashboardPeriod.ALL);

        assertThat(dto.countsByStatus()).containsExactly(
                new DashboardDto.StatusCount(ClaimStatus.SUBMITTED, 2),
                new DashboardDto.StatusCount(ClaimStatus.ASSIGNED, 0),
                new DashboardDto.StatusCount(ClaimStatus.IN_PROGRESS, 0),
                new DashboardDto.StatusCount(ClaimStatus.SETTLED, 2),
                new DashboardDto.StatusCount(ClaimStatus.REJECTED, 0));
        assertThat(dto.closedCounts()).isEqualTo(new DashboardDto.ClosedCounts(2, 0));
        assertThat(dto.submittedCount()).isEqualTo(4);
        assertThat(dto.unassignedCount()).isEqualTo(2);
    }

    @Test
    void workloadHasOneRowPerStaffIncludingZero() {
        DashboardDto dto = service.get(DashboardPeriod.ALL);

        assertThat(dto.workload()).hasSize(2);
        assertThat(dto.workload().get(0).staff().displayName()).isEqualTo("Chris Lim");
        assertThat(dto.workload().get(0).assignedCount()).isEqualTo(1);
        assertThat(dto.workload().get(0).inProgressCount()).isEqualTo(1);
        assertThat(dto.workload().get(1).staff().displayName()).isEqualTo("Dana Ng");
        assertThat(dto.workload().get(1).assignedCount()).isZero();
        assertThat(dto.workload().get(1).inProgressCount()).isZero();
    }

    @Test
    void liabilityAndSettledTotalsAreSortedByMarketAndCurrencyWithoutConversion() {
        DashboardDto dto = service.get(DashboardPeriod.ALL);

        assertThat(dto.outstandingLiability()).extracting(DashboardDto.Liability::market)
                .containsExactly(Market.SG, Market.MY);
        assertThat(dto.outstandingLiability().get(0).amount()).isEqualByComparingTo("7500.00");
        assertThat(dto.outstandingLiability().get(0).openClaimCount()).isEqualTo(2);
        assertThat(dto.settledTotals()).extracting(DashboardDto.SettledTotal::currency)
                .containsExactly(Currency.SGD, Currency.THB);
        verify(claimRepository).outstandingLiability(ClaimStatus.OPEN);
    }
}
