package com.chubb.claims.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/** Typed config under {@code app.*}. Validated at startup so a bad secret fails fast. */
public final class AppProperties {

    private AppProperties() {
    }

    @Validated
    @ConfigurationProperties(prefix = "app.jwt")
    public record Jwt(@NotBlank @Size(min = 32, message = "must be at least 32 characters for HS256") String secret,
                      @Min(60) long expirationSeconds) {
    }

    @Validated
    @ConfigurationProperties(prefix = "app.cors")
    public record Cors(@NotEmpty List<String> allowedOrigins) {
    }

    @Validated
    @ConfigurationProperties(prefix = "app.seed")
    public record Seed(boolean enabled, @NotBlank String demoPassword) {
    }
}
