package com.chubb.claims.claim;

import com.chubb.claims.common.error.ApiException;
import com.chubb.claims.common.error.ErrorCode;

/** 404, also used when a claimant opens another claimant's claim so its existence isn't revealed (01 A4). */
public class ClaimNotFoundException extends ApiException {

    public ClaimNotFoundException(Long id) {
        super(ErrorCode.CLAIM_NOT_FOUND, "Claim " + id + " not found");
    }
}
