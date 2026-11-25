package com.chubb.claims.claim;

import com.chubb.claims.common.error.ApiException;
import com.chubb.claims.common.error.ErrorCode;

/** 400 when the assignment target is not an enabled CLAIMS_STAFF user. */
public class InvalidAssigneeException extends ApiException {

    public InvalidAssigneeException(Long userId) {
        super(ErrorCode.INVALID_ASSIGNEE, "User " + userId + " is not a claims staff member");
    }
}
