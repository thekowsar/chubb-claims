package com.chubb.claims.claim.dto;

import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.UserRef;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(name = "MessageDto")
public record MessageDto(
        Long id,
        UserRef author,
        @Schema(description = "Taken from the author role in roles") RoleCode authorRole,
        String body,
        Instant createdAt) {

    @Override
    public String toString() {
        return "MessageDto[id=" + id + "]";
    }
}
