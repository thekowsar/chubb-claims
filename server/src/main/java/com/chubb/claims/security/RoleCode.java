package com.chubb.claims.security;

/**
 * Role codes. They must match {@code roles.code} (03 §2); {@link com.chubb.claims.seed.RoleCodeStartupCheck}
 * fails startup if one is missing.
 */
public enum RoleCode {
    CLAIMANT,
    CLAIMS_STAFF,
    MANAGER;

    /** For {@code @PreAuthorize}: any logged-in role. */
    public static final String ANY_ROLE = "hasAnyRole('CLAIMANT','CLAIMS_STAFF','MANAGER')";

    public String authority() {
        return "ROLE_" + name();
    }
}
