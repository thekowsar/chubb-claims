package com.chubb.claims.claim;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimMessageRepository extends JpaRepository<ClaimMessage, Long> {

    /** Thread in time order, with each author's role for the authorRole field. */
    @EntityGraph(attributePaths = {"author", "author.role"})
    List<ClaimMessage> findByClaimIdOrderByCreatedAtAscIdAsc(Long claimId);

    long countByClaimId(Long claimId);
}
