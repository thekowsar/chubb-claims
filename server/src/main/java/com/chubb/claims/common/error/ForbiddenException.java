package com.chubb.claims.common.error;

/** 403 ACCESS_DENIED raised by a service-layer ownership check (e.g. staff acting on a claim not assigned to them). */
public class ForbiddenException extends ApiException {

    public ForbiddenException() {
        super(ErrorCode.ACCESS_DENIED, "You are not allowed to perform this action");
    }
}
