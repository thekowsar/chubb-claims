package com.chubb.claims.support;

import com.chubb.claims.claim.Claim;
import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.claim.ClaimType;
import com.chubb.claims.claim.Market;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.user.Role;
import com.chubb.claims.user.User;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Entity fixtures for unit tests (no database). */
public final class TestData {

    public static final Instant NOW = Instant.parse("2026-11-25T09:30:00Z");

    private TestData() {
    }

    public static User user(long id, String username, String displayName, String roleCode) {
        Role role = BeanUtils.instantiateClass(Role.class);
        ReflectionTestUtils.setField(role, "code", roleCode);
        User user = User.create(username, "$2a$10$hash", displayName, role);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    public static User claimant1() {
        return user(1, "claimant1", "Alice Tan", "CLAIMANT");
    }

    public static User claimant2() {
        return user(2, "claimant2", "Ben Wong", "CLAIMANT");
    }

    public static User staff1() {
        return user(3, "staff1", "Chris Lim", "CLAIMS_STAFF");
    }

    public static User staff2() {
        return user(4, "staff2", "Dana Ng", "CLAIMS_STAFF");
    }

    public static User manager() {
        return user(5, "manager1", "Evan Lee", "MANAGER");
    }

    public static AuthenticatedUser principal(User user) {
        return new AuthenticatedUser(user.getId(), user.getUsername(), user.getRole().getCode());
    }

    /** A claim in the given status, owned by claimant1, assigned to staff1 unless SUBMITTED. */
    public static Claim claim(long id, ClaimStatus status) {
        Claim claim = Claim.submit("CLM-2026-" + String.format("%06d", id), ClaimType.MOTOR, Market.SG,
                "POL-1", LocalDate.parse("2026-11-20"), "Somewhere", "Something happened here.",
                new BigDecimal("4500.00"), Market.SG.defaultCurrency(), claimant1());
        ReflectionTestUtils.setField(claim, "id", id);
        if (status != ClaimStatus.SUBMITTED) {
            claim.assignTo(staff1(), NOW);
        }
        if (status == ClaimStatus.IN_PROGRESS || status == ClaimStatus.SETTLED || status == ClaimStatus.REJECTED) {
            claim.start(NOW);
        }
        if (status == ClaimStatus.SETTLED) {
            claim.assess(new BigDecimal("1000.00"));
            claim.settle(new BigDecimal("900.00"), "ok", NOW);
        }
        if (status == ClaimStatus.REJECTED) {
            claim.reject("no", NOW);
        }
        return claim;
    }
}
