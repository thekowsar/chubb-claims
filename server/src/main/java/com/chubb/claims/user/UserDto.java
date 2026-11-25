package com.chubb.claims.user;

import com.chubb.claims.security.RoleCode;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "UserDto")
public record UserDto(
        @Schema(example = "5") Long id,
        @Schema(example = "manager1") String username,
        @Schema(example = "Evan Lee") String displayName,
        RoleCode role) {

    /** Call inside a transaction: reads the lazy role. */
    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getDisplayName(),
                RoleCode.valueOf(user.getRole().getCode()));
    }
}
