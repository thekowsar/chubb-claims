package com.chubb.claims.claim.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(name = "ClaimSummaryPage")
public record ClaimSummaryPage(
        List<ClaimSummaryDto> items,
        @Schema(description = "Current page, starting at 0") int page,
        int size,
        long totalElements,
        int totalPages) {
}
