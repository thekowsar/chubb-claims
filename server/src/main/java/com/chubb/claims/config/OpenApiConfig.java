package com.chubb.claims.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** springdoc metadata. The contract of record is planning/04-api-spec.yaml; this must stay consistent with it. */
@Configuration
public class OpenApiConfig {

    public static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI chubbClaimsOpenApi() {
        return new OpenAPI()
                .info(new Info().title("chubb-claims API").version("1.0.0")
                        .description("REST API for the chubb-claims platform. Every response uses the ApiResponse envelope."))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                        .description("HS256 JWT from POST /api/auth/login. Claims: sub (user id), username, role. "
                                + "It expires after 60 minutes.")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }
}
