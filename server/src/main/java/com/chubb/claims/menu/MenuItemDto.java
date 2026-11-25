package com.chubb.claims.menu;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "MenuItemDto")
public record MenuItemDto(
        @Schema(example = "MY_CLAIMS") String code,
        @Schema(example = "My claims") String label,
        @Schema(example = "/claimant/claims") String route,
        @Schema(nullable = true, example = "list") String icon,
        @Schema(example = "10") Integer sortOrder) {
}
