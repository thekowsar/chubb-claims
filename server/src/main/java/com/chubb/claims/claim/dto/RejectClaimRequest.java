package com.chubb.claims.claim.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "RejectClaimRequest")
public record RejectClaimRequest(@NotBlank @Size(max = 2000) String decisionNote) {

    @Override
    public String toString() {
        return "RejectClaimRequest[]";
    }
}
