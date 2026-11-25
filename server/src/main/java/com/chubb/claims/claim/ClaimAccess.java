package com.chubb.claims.claim;

import com.chubb.claims.common.error.ForbiddenException;
import com.chubb.claims.common.error.UnauthorizedException;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Loads a claim and applies the ownership rules (02 §5, W1) in the contract's order: 404 first, then 403.
 * CLAIMANT on another claimant's claim gets 404 (01 A4). CLAIMS_STAFF on a claim not assigned to them gets 403.
 * MANAGER can see every claim.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ClaimAccess {

    private final ClaimRepository claimRepository;
    private final UserRepository userRepository;

    public Claim loadForView(Long id, AuthenticatedUser user) {
        Claim claim = find(id);
        switch (role(user)) {
            case CLAIMANT -> {
                if (!claim.isOwnedBy(user.id())) {
                    log.warn("Claim hidden from claimant claimId={} userId={}", id, user.id());
                    throw new ClaimNotFoundException(id);
                }
            }
            case CLAIMS_STAFF -> requireAssigned(claim, user);
            case MANAGER -> {
                // read access to every claim
            }
        }
        return claim;
    }

    /** For start, assess, settle and reject: the caller must be the assigned staff member. */
    public Claim loadForStaffAction(Long id, AuthenticatedUser user) {
        Claim claim = find(id);
        if (role(user) != RoleCode.CLAIMS_STAFF) {
            log.warn("Access denied claimId={} userId={} role={}", id, user.id(), user.role());
            throw new ForbiddenException();
        }
        requireAssigned(claim, user);
        return claim;
    }

    /** The caller as an entity, for claimant, author and changedBy links. */
    public User actor(AuthenticatedUser user) {
        return userRepository.findWithRoleById(user.id())
                .filter(User::isEnabled)
                .orElseThrow(UnauthorizedException::new);
    }

    public RoleCode role(AuthenticatedUser user) {
        try {
            return RoleCode.valueOf(user.role());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown role userId={}", user.id());
            throw new ForbiddenException();
        }
    }

    private Claim find(Long id) {
        return claimRepository.findWithUsersById(id).orElseThrow(() -> {
            log.warn("Claim not found claimId={}", id);
            return new ClaimNotFoundException(id);
        });
    }

    private void requireAssigned(Claim claim, AuthenticatedUser user) {
        if (!claim.isAssignedTo(user.id())) {
            log.warn("Access denied claimId={} userId={}", claim.getId(), user.id());
            throw new ForbiddenException();
        }
    }
}
