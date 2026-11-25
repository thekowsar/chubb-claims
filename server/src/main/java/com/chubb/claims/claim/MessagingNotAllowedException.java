package com.chubb.claims.claim;

import com.chubb.claims.common.error.ApiException;
import com.chubb.claims.common.error.ErrorCode;

/** 409 when a message is sent while the claim is not IN_PROGRESS. */
public class MessagingNotAllowedException extends ApiException {

    public MessagingNotAllowedException() {
        super(ErrorCode.MESSAGING_NOT_ALLOWED, "Messages can only be sent while the claim is IN_PROGRESS");
    }
}
