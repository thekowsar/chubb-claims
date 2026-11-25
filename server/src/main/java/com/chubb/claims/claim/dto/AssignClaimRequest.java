package com.chubb.claims.claim.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Schema(name = "AssignClaimRequest")
public record AssignClaimRequest(@Schema(example = "3", minimum = "1") @NotNull @Positive Long staffId) {
}
