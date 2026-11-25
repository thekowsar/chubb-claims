package com.chubb.claims.common.api;

import io.swagger.v3.oas.annotations.media.Schema;

/** One entry of {@code error.details}. Named FieldError in the OpenAPI contract. */
@Schema(name = "FieldError")
public record FieldErrorDetail(
        @Schema(nullable = true, example = "estimatedAmount") String field,
        @Schema(example = "must be greater than 0") String message) {
}
