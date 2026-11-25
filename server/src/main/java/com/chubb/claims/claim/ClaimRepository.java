package com.chubb.claims.claim;

import com.chubb.claims.dashboard.CurrencyAmountRow;
import com.chubb.claims.dashboard.LiabilityRow;
import com.chubb.claims.dashboard.StaffStatusCountRow;
import com.chubb.claims.dashboard.StatusCountRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ClaimRepository extends JpaRepository<Claim, Long>, JpaSpecificationExecutor<Claim> {

    /** Paged, filtered list with the claimant and staff names in the same query (03 §6, no N+1). */
    @Override
    @EntityGraph(attributePaths = {"claimant", "assignedStaff"})
    Page<Claim> findAll(Specification<Claim> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"claimant", "assignedStaff"})
    Optional<Claim> findWithUsersById(Long id);

    // ---------- Dashboard queries (03 §4.4). Projections only, no entities loaded. ----------

    @Query("""
            select new com.chubb.claims.dashboard.StatusCountRow(c.status, count(c))
            from Claim c where c.createdAt >= :from group by c.status""")
    List<StatusCountRow> countByStatusSubmittedSince(@Param("from") Instant from);

    @Query("select count(c) from Claim c where c.createdAt >= :from")
    long countSubmittedSince(@Param("from") Instant from);

    @Query("""
            select new com.chubb.claims.dashboard.StatusCountRow(c.status, count(c))
            from Claim c where c.status in :statuses and c.closedAt >= :from group by c.status""")
    List<StatusCountRow> countClosedSince(@Param("statuses") Collection<ClaimStatus> statuses,
                                          @Param("from") Instant from);

    long countByStatus(ClaimStatus status);

    @Query("""
            select new com.chubb.claims.dashboard.StaffStatusCountRow(c.assignedStaff.id, c.status, count(c))
            from Claim c where c.status in :statuses and c.assignedStaff is not null
            group by c.assignedStaff.id, c.status""")
    List<StaffStatusCountRow> countByStaffAndStatus(@Param("statuses") Collection<ClaimStatus> statuses);

    @Query("""
            select new com.chubb.claims.dashboard.LiabilityRow(c.market, c.currency,
                   sum(coalesce(c.assessedAmount, c.estimatedAmount)), count(c))
            from Claim c where c.status in :statuses group by c.market, c.currency""")
    List<LiabilityRow> outstandingLiability(@Param("statuses") Collection<ClaimStatus> statuses);

    @Query("""
            select new com.chubb.claims.dashboard.CurrencyAmountRow(c.currency, sum(c.settledAmount))
            from Claim c where c.status = com.chubb.claims.claim.ClaimStatus.SETTLED and c.closedAt >= :from
            group by c.currency""")
    List<CurrencyAmountRow> settledTotalsSince(@Param("from") Instant from);
}
