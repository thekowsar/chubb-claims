package com.chubb.claims.claim.dto;

import com.chubb.claims.claim.ClaimType;
import com.chubb.claims.claim.Currency;
import com.chubb.claims.claim.Market;
import com.chubb.claims.common.validation.NotInFuture;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Claimant's new claim. The claimant comes from the token, never the body. Currency defaults from market. */
@Schema(name = "CreateClaimRequest")
public record CreateClaimRequest(
        @NotNull ClaimType type,
        @NotNull Market market,
        @Schema(example = "POL-SG-778812") @NotBlank @Size(max = 30) String policyNumber,
        @Schema(description = "Must not be in the future", example = "2026-11-20")
        @NotNull @NotInFuture LocalDate incidentDate,
        @Schema(example = "Orchard Road, Singapore") @NotBlank @Size(max = 200) String location,
        @NotBlank @Size(min = 10, max = 2000) String description,
        @Schema(example = "4500.00", minimum = "0.01")
        @NotNull @Positive @Digits(integer = 13, fraction = 2) BigDecimal estimatedAmount,
        @Schema(description = "Optional. Defaults to the market currency.", nullable = true) Currency currency) {

    /** Descriptions and locations are personal data: keep them out of logs. */
    @Override
    public String toString() {
        return "CreateClaimRequest[type=" + type + ", market=" + market + "]";
    }
}
