package com.chubb.claims.claim.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "SendMessageRequest")
public record SendMessageRequest(@NotBlank @Size(max = 2000) String body) {

    @Override
    public String toString() {
        return "SendMessageRequest[]";
    }
}
