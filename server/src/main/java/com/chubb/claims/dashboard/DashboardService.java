package com.chubb.claims.dashboard;

import com.chubb.claims.claim.ClaimRepository;
import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserRef;
import com.chubb.claims.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Dashboard figures, calculated from the database on every call (04 /api/dashboard, 01 §5.3).
 * countsByStatus, submittedCount, closedCounts and settledTotals follow the period; unassignedCount, workload
 * and outstandingLiability are a snapshot of now. Amounts in different currencies are never added together.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ClaimRepository claimRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public DashboardDto get(DashboardPeriod period) {
        Instant now = clock.instant();
        Instant from = period.from(now);
        Instant queryFrom = from == null ? Instant.EPOCH : from;

        Map<ClaimStatus, Long> byStatus = toMap(claimRepository.countByStatusSubmittedSince(queryFrom));
        List<DashboardDto.StatusCount> countsByStatus = Arrays.stream(ClaimStatus.values())
                .map(s -> new DashboardDto.StatusCount(s, byStatus.getOrDefault(s, 0L)))
                .toList();

        Map<ClaimStatus, Long> closed = toMap(claimRepository.countClosedSince(ClaimStatus.CLOSED, queryFrom));
        var closedCounts = new DashboardDto.ClosedCounts(closed.getOrDefault(ClaimStatus.SETTLED, 0L),
                closed.getOrDefault(ClaimStatus.REJECTED, 0L));

        DashboardDto dto = new DashboardDto(period, from, now,
                claimRepository.countSubmittedSince(queryFrom),
                closedCounts,
                claimRepository.countByStatus(ClaimStatus.SUBMITTED),
                countsByStatus,
                workload(),
                liability(),
                settledTotals(queryFrom),
                now);
        log.info("Dashboard generated period={} submitted={} unassigned={}", period, dto.submittedCount(),
                dto.unassignedCount());
        return dto;
    }

    /** One row per enabled CLAIMS_STAFF user, including users with no claims, sorted by display name. */
    private List<DashboardDto.Workload> workload() {
        List<StaffStatusCountRow> rows = claimRepository.countByStaffAndStatus(
                EnumSet.of(ClaimStatus.ASSIGNED, ClaimStatus.IN_PROGRESS));
        List<User> staff = userRepository.findByRoleCodeAndEnabledTrueOrderByDisplayNameAsc(
                RoleCode.CLAIMS_STAFF.name());
        return staff.stream().map(u -> new DashboardDto.Workload(UserRef.of(u),
                count(rows, u.getId(), ClaimStatus.ASSIGNED),
                count(rows, u.getId(), ClaimStatus.IN_PROGRESS))).toList();
    }

    private List<DashboardDto.Liability> liability() {
        return claimRepository.outstandingLiability(ClaimStatus.OPEN).stream()
                .sorted(Comparator.comparing(LiabilityRow::market).thenComparing(LiabilityRow::currency))
                .map(r -> new DashboardDto.Liability(r.market(), r.currency(), money(r.amount()), r.openClaimCount()))
                .toList();
    }

    private List<DashboardDto.SettledTotal> settledTotals(Instant from) {
        return claimRepository.settledTotalsSince(from).stream()
                .sorted(Comparator.comparing(CurrencyAmountRow::currency))
                .map(r -> new DashboardDto.SettledTotal(r.currency(), money(r.amount())))
                .toList();
    }

    private static long count(List<StaffStatusCountRow> rows, Long staffId, ClaimStatus status) {
        return rows.stream().filter(r -> r.staffId().equals(staffId) && r.status() == status)
                .mapToLong(StaffStatusCountRow::count).sum();
    }

    private static Map<ClaimStatus, Long> toMap(List<StatusCountRow> rows) {
        return rows.stream().collect(Collectors.toMap(StatusCountRow::status, StatusCountRow::count));
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO.setScale(2) : amount.setScale(2);
    }
}
