package com.chubb.claims.common.error;

/** Missing, invalid or expired token, or a token whose user no longer exists or is disabled. */
public class UnauthorizedException extends ApiException {

    public UnauthorizedException() {
        super(ErrorCode.UNAUTHORIZED, "Authentication required");
    }
}
