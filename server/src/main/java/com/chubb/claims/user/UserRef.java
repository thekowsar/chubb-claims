package com.chubb.claims.user;

import io.swagger.v3.oas.annotations.media.Schema;

/** Short user reference embedded in other DTOs. Null where no user is set (NullableUserRef in the contract). */
@Schema(name = "UserRef")
public record UserRef(@Schema(example = "3") Long id, @Schema(example = "Chris Lim") String displayName) {

    public static UserRef of(User user) {
        return user == null ? null : new UserRef(user.getId(), user.getDisplayName());
    }
}
