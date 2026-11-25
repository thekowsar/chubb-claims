package com.chubb.claims.common.api;

import com.chubb.claims.common.error.ErrorCode;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(name = "ApiError", description = "Null on success")
public record ApiError(ErrorCode code, String message, List<FieldErrorDetail> details) {

    public ApiError {
        details = details == null ? List.of() : List.copyOf(details);
    }

    public static ApiError of(ErrorCode code, String message) {
        return new ApiError(code, message, List.of());
    }
}
