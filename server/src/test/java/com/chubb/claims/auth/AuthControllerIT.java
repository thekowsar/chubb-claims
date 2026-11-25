package com.chubb.claims.auth;

import com.chubb.claims.config.AppProperties;
import com.chubb.claims.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** MockMvc against the full app (H2 in memory, Flyway V1+V2, seeder on). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIT {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private AppProperties.Jwt jwtProps;
    @Autowired
    private JdbcTemplate jdbc;
    @Value("${app.seed.demo-password}")
    private String demoPassword;

    @AfterEach
    void reEnableUsers() {
        jdbc.update("UPDATE users SET enabled = TRUE");
    }

    // ---------- POST /api/auth/login ----------

    @ParameterizedTest
    @CsvSource({
            "claimant1, Alice Tan, CLAIMANT",
            "claimant2, Ben Wong,  CLAIMANT",
            "staff1,    Chris Lim, CLAIMS_STAFF",
            "staff2,    Dana Ng,   CLAIMS_STAFF",
            "manager1,  Evan Lee,  MANAGER"})
    void loginSucceedsForEverySeedUser(String username, String displayName, String role) throws Exception {
        login(username, demoPassword)
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Correlation-Id"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.error").value(nullValue()))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.data.token", not(emptyString())))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(3600))
                .andExpect(jsonPath("$.data.user.id").isNumber())
                .andExpect(jsonPath("$.data.user.username").value(username))
                .andExpect(jsonPath("$.data.user.displayName").value(displayName))
                .andExpect(jsonPath("$.data.user.role").value(role))
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist());
    }

    @Test
    void loginTokenCarriesUserIdUsernameAndRole() throws Exception {
        JsonNode data = loginData("manager1");

        var principal = jwtService.parse(data.get("token").asText());

        assertThat(principal.id()).isEqualTo(data.get("user").get("id").asLong());
        assertThat(principal.username()).isEqualTo("manager1");
        assertThat(principal.role()).isEqualTo("MANAGER");
    }

    @Test
    void loginIgnoresUsernameCase() throws Exception {
        login("Manager1", demoPassword).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.username").value("manager1"));
    }

    @Test
    void wrongPasswordGives401InvalidCredentials() throws Exception {
        expectInvalidCredentials(login("claimant1", "wrong-password"));
    }

    @Test
    void unknownUserGivesTheSame401() throws Exception {
        expectInvalidCredentials(login("nobody", demoPassword));
    }

    @Test
    void disabledUserGives401InvalidCredentials() throws Exception {
        jdbc.update("UPDATE users SET enabled = FALSE WHERE username = 'claimant2'");

        expectInvalidCredentials(login("claimant2", demoPassword));
    }

    @Test
    void blankFieldsGive400WithFieldDetails() throws Exception {
        login("", " ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.error.message").value("Request validation failed"))
                .andExpect(jsonPath("$.error.details", hasSize(2)))
                .andExpect(jsonPath("$.error.details[0].field").value("password"))
                .andExpect(jsonPath("$.error.details[1].field").value("username"));
    }

    @Test
    void tooLongUsernameGives400() throws Exception {
        login("u".repeat(51), "x")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.error.details[0].field").value("username"));
    }

    @Test
    void malformedJsonGives400() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
    }

    @Test
    void loginEchoesTheCallersCorrelationId() throws Exception {
        mvc.perform(post("/api/auth/login").header("X-Correlation-Id", "test-corr-42")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "staff1", "password", demoPassword))))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Correlation-Id", "test-corr-42"));
    }

    @Test
    void loginIsPublicEvenWithAGarbageBearerHeader() throws Exception {
        mvc.perform(post("/api/auth/login").header("Authorization", "Bearer garbage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "staff1", "password", demoPassword))))
                .andExpect(status().isOk());
    }

    // ---------- GET /api/auth/me ----------

    @Test
    void meReturnsTheLoggedInUser() throws Exception {
        String token = loginData("staff2").get("token").asText();

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("staff2"))
                .andExpect(jsonPath("$.data.displayName").value("Dana Ng"))
                .andExpect(jsonPath("$.data.role").value("CLAIMS_STAFF"));
    }

    @Test
    void meWithoutTokenGives401Unauthorized() throws Exception {
        expectUnauthorized(mvc.perform(get("/api/auth/me")));
    }

    @Test
    void meWithInvalidTokenGives401Unauthorized() throws Exception {
        expectUnauthorized(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer not.a.jwt")));
    }

    @Test
    void meWithExpiredTokenGives401Unauthorized() throws Exception {
        JwtService past = new JwtService(jwtProps,
                Clock.fixed(Instant.now().minus(Duration.ofHours(2)), ZoneOffset.UTC));
        String expired = past.generate(1L, "claimant1", "CLAIMANT");

        expectUnauthorized(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + expired)));
    }

    @Test
    void meForADisabledUserGives401Unauthorized() throws Exception {
        String token = loginData("claimant2").get("token").asText();
        jdbc.update("UPDATE users SET enabled = FALSE WHERE username = 'claimant2'");

        expectUnauthorized(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)));
    }

    @Test
    void meWithUnknownRoleGives403AccessDenied() throws Exception {
        String token = jwtService.generate(1L, "claimant1", "AUDITOR");

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void unknownRouteGives404InEnvelope() throws Exception {
        String token = loginData("manager1").get("token").asText();

        mvc.perform(get("/api/does-not-exist").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void wrongMethodGives405InEnvelope() throws Exception {
        String token = loginData("manager1").get("token").asText();

        mvc.perform(post("/api/menu").header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void swaggerApiDocsArePublic() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.operationId").value("login"))
                .andExpect(jsonPath("$.paths['/api/auth/me'].get.operationId").value("getCurrentUser"))
                .andExpect(jsonPath("$.paths['/api/menu'].get.operationId").value("getMyMenu"));
    }

    /** Every operationId in planning/04-api-spec.yaml is served by springdoc with the same path and method. */
    @ParameterizedTest(name = "{1} {0} -> {2}")
    @CsvSource({
            "/api/auth/login, post, login",
            "/api/auth/me, get, getCurrentUser",
            "/api/menu, get, getMyMenu",
            "/api/claims, get, searchClaims",
            "/api/claims, post, createClaim",
            "/api/claims/{id}, get, getClaim",
            "/api/claims/{id}/assignment, put, assignClaim",
            "/api/claims/{id}/start, post, startClaim",
            "/api/claims/{id}/assessment, patch, assessClaim",
            "/api/claims/{id}/settle, post, settleClaim",
            "/api/claims/{id}/reject, post, rejectClaim",
            "/api/claims/{id}/messages, get, listClaimMessages",
            "/api/claims/{id}/messages, post, sendClaimMessage",
            "/api/claims/{id}/history, get, getClaimHistory",
            "/api/users, get, listUsers",
            "/api/dashboard, get, getDashboard"})
    void swaggerMatchesTheContractOperations(String path, String method, String operationId) throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.paths['" + path + "']." + method + ".operationId").value(operationId));
    }

    // ---------- helpers ----------

    private ResultActions login(String username, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("username", username, "password", password))));
    }

    private JsonNode loginData(String username) throws Exception {
        String body = login(username, demoPassword).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("data");
    }

    private void expectInvalidCredentials(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.error.message").value("Invalid username or password"))
                .andExpect(jsonPath("$.error.details", hasSize(0)));
    }

    private void expectUnauthorized(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(header().exists("X-Correlation-Id"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.error.message").value("Authentication required"));
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
