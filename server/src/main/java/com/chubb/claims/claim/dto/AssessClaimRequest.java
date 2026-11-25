package com.chubb.claims.claim.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

@Schema(name = "AssessClaimRequest")
public record AssessClaimRequest(
        @Schema(example = "5800.00", minimum = "0")
        @NotNull @PositiveOrZero @Digits(integer = 13, fraction = 2) BigDecimal assessedAmount) {

    @Override
    public String toString() {
        return "AssessClaimRequest[]";
    }
}
