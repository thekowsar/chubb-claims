package com.chubb.claims.common.error;

import org.springframework.http.HttpStatus;

/**
 * Stable error codes from 04-api-spec.yaml (components.schemas.ErrorCode), each paired with its HTTP status.
 * NOT_FOUND and METHOD_NOT_ALLOWED cover unknown routes and wrong methods (04-api-summary A7).
 */
public enum ErrorCode {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST),
    INVALID_ASSIGNEE(HttpStatus.BAD_REQUEST),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED(HttpStatus.FORBIDDEN),
    CLAIM_NOT_FOUND(HttpStatus.NOT_FOUND),
    NOT_FOUND(HttpStatus.NOT_FOUND),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED),
    INVALID_STATUS_TRANSITION(HttpStatus.CONFLICT),
    MESSAGING_NOT_ALLOWED(HttpStatus.CONFLICT),
    CONCURRENT_MODIFICATION(HttpStatus.CONFLICT),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
