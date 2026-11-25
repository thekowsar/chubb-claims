package com.chubb.claims.claim;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimStatusHistoryRepository extends JpaRepository<ClaimStatusHistory, Long> {

    @EntityGraph(attributePaths = {"changedBy", "assignedStaff"})
    List<ClaimStatusHistory> findByClaimIdOrderByChangedAtAscIdAsc(Long claimId);
}
