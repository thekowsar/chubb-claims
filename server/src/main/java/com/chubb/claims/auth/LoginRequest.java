package com.chubb.claims.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "LoginRequest")
public record LoginRequest(
        @Schema(example = "manager1", minLength = 1, maxLength = 50)
        @NotBlank @Size(max = 50) String username,
        @Schema(format = "password", minLength = 1, maxLength = 100, accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank @Size(max = 100) String password) {

    /** Never print the password. */
    @Override
    public String toString() {
        return "LoginRequest[username=" + username + "]";
    }
}
