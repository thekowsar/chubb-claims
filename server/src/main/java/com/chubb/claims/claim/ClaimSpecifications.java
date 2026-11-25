package com.chubb.claims.claim;

import com.chubb.claims.claim.dto.ClaimSearchFilter;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZoneOffset;

/**
 * Builds the list query (02 §4.5). The role scope always comes first, so query parameters can never widen it:
 * CLAIMANT sees own claims, CLAIMS_STAFF sees claims assigned to them, MANAGER sees all.
 */
public final class ClaimSpecifications {

    private ClaimSpecifications() {
    }

    public static Specification<Claim> forSearch(AuthenticatedUser user, ClaimSearchFilter filter) {
        return roleScope(user)
                .and(statusIn(filter))
                .and(eq("market", filter.market()))
                .and(eq("type", filter.type()))
                .and(submittedFrom(filter))
                .and(submittedTo(filter));
    }

    static Specification<Claim> roleScope(AuthenticatedUser user) {
        RoleCode role = RoleCode.valueOf(user.role());
        return switch (role) {
            case CLAIMANT -> (root, q, cb) -> cb.equal(root.get("claimant").get("id"), user.id());
            case CLAIMS_STAFF -> (root, q, cb) -> cb.equal(root.get("assignedStaff").get("id"), user.id());
            case MANAGER -> (root, q, cb) -> cb.conjunction();
        };
    }

    private static Specification<Claim> statusIn(ClaimSearchFilter filter) {
        return filter.statuses().isEmpty() ? null : (root, q, cb) -> root.get("status").in(filter.statuses());
    }

    private static Specification<Claim> eq(String attribute, Object value) {
        return value == null ? null : (root, q, cb) -> cb.equal(root.get(attribute), value);
    }

    /** Inclusive, from 00:00 UTC of that day. */
    private static Specification<Claim> submittedFrom(ClaimSearchFilter filter) {
        if (filter.submittedFrom() == null) {
            return null;
        }
        var from = filter.submittedFrom().atStartOfDay(ZoneOffset.UTC).toInstant();
        return (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    /** Inclusive up to the end of that day in UTC, i.e. before 00:00 of the next day. */
    private static Specification<Claim> submittedTo(ClaimSearchFilter filter) {
        if (filter.submittedTo() == null) {
            return null;
        }
        var toExclusive = filter.submittedTo().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        return (root, q, cb) -> cb.lessThan(root.get("createdAt"), toExclusive);
    }
}
