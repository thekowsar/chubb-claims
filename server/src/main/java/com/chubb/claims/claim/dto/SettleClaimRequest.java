package com.chubb.claims.claim.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Settle uses the stored assessedAmount (02 W2); settledAmount must not exceed it (checked in the service). */
@Schema(name = "SettleClaimRequest")
public record SettleClaimRequest(
        @Schema(example = "5500.00", minimum = "0.01", description = "Must be no more than the stored assessedAmount")
        @NotNull @Positive @Digits(integer = 13, fraction = 2) BigDecimal settledAmount,
        @NotBlank @Size(max = 2000) String decisionNote) {

    @Override
    public String toString() {
        return "SettleClaimRequest[]";
    }
}
