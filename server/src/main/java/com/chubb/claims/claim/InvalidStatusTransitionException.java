package com.chubb.claims.claim;

import com.chubb.claims.common.error.ApiException;
import com.chubb.claims.common.error.ErrorCode;

/** 409 for any move the status policy does not allow (02 §2). */
public class InvalidStatusTransitionException extends ApiException {

    public InvalidStatusTransitionException(ClaimStatus from, ClaimStatus to) {
        super(ErrorCode.INVALID_STATUS_TRANSITION, "Cannot move claim from " + from + " to " + to);
    }

    public InvalidStatusTransitionException(String message) {
        super(ErrorCode.INVALID_STATUS_TRANSITION, message);
    }
}
