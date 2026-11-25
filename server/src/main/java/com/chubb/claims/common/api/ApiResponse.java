package com.chubb.claims.common.api;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * The one response envelope used by every endpoint, success or failure (CLAUDE.md, 04-api-spec ApiResponse).
 */
@Schema(name = "ApiResponse", description = "Common envelope for every response")
@JsonPropertyOrder({"success", "data", "error", "timestamp"})
public record ApiResponse<T>(boolean success, T data, ApiError error, Instant timestamp) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, Instant.now());
    }

    public static ApiResponse<Void> failure(ApiError error) {
        return new ApiResponse<>(false, null, error, Instant.now());
    }
}
