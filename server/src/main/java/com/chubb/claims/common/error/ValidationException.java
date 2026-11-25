package com.chubb.claims.common.error;

import com.chubb.claims.common.api.FieldErrorDetail;

import java.util.List;

/** 400 VALIDATION_FAILED for a business rule checked in the service (e.g. settled amount above assessed). */
public class ValidationException extends ApiException {

    public ValidationException(String field, String message) {
        super(ErrorCode.VALIDATION_FAILED, "Request validation failed", List.of(new FieldErrorDetail(field, message)));
    }
}
