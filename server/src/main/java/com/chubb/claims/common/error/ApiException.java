package com.chubb.claims.common.error;

import com.chubb.claims.common.api.FieldErrorDetail;
import lombok.Getter;

import java.util.List;

/** Base for every business exception. The HTTP status comes from the {@link ErrorCode}. */
@Getter
public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final transient List<FieldErrorDetail> details;

    public ApiException(ErrorCode code, String message) {
        this(code, message, List.of());
    }

    public ApiException(ErrorCode code, String message, List<FieldErrorDetail> details) {
        super(message);
        this.code = code;
        this.details = details == null ? List.of() : List.copyOf(details);
    }
}
