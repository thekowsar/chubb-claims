package com.chubb.claims.auth;

import com.chubb.claims.user.UserDto;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "LoginResponse")
public record LoginResponse(
        @Schema(description = "JWT") String token,
        @Schema(allowableValues = "Bearer") String tokenType,
        @Schema(description = "Seconds until expiry", example = "3600") long expiresIn,
        UserDto user) {

    public static final String BEARER = "Bearer";

    @Override
    public String toString() {
        return "LoginResponse[userId=" + (user == null ? null : user.id()) + "]";
    }
}
