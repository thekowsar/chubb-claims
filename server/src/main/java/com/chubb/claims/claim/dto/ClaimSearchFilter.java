package com.chubb.claims.claim.dto;

import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.claim.ClaimType;
import com.chubb.claims.claim.Market;

import java.time.LocalDate;
import java.util.List;

/** Optional list filters, combined with AND after the role scope (02 §4.5). */
public record ClaimSearchFilter(List<ClaimStatus> statuses, Market market, ClaimType type,
                                LocalDate submittedFrom, LocalDate submittedTo) {

    public ClaimSearchFilter {
        statuses = statuses == null ? List.of() : List.copyOf(statuses);
    }
}
