package com.chubb.claims.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Shared helpers for MockMvc tests against the full app (H2 in memory, Flyway, seed data).
 * Tests that change claims create their own, so they don't depend on each other or on the order they run in.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiTestSupport {

    protected static final String CLAIMANT1 = "claimant1";
    protected static final String CLAIMANT2 = "claimant2";
    protected static final String STAFF1 = "staff1";
    protected static final String STAFF2 = "staff2";
    protected static final String MANAGER = "manager1";

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected ObjectMapper objectMapper;
    @Autowired
    protected JdbcTemplate jdbc;
    @Value("${app.seed.demo-password}")
    protected String demoPassword;

    private final Map<String, String> tokens = new HashMap<>();

    protected String token(String username) throws Exception {
        if (!tokens.containsKey(username)) {
            String body = mvc.perform(request(HttpMethod.POST, "/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("username", username, "password", demoPassword))))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            tokens.put(username, objectMapper.readTree(body).at("/data/token").asText());
        }
        return tokens.get(username);
    }

    protected ResultActions call(HttpMethod method, String url, String username, Object body) throws Exception {
        MockHttpServletRequestBuilder builder = request(method, url);
        if (username != null) {
            builder.header("Authorization", "Bearer " + token(username));
        }
        if (body != null) {
            builder.contentType(MediaType.APPLICATION_JSON).content(body instanceof String s ? s : json(body));
        }
        return mvc.perform(builder);
    }

    protected ResultActions get(String url, String username) throws Exception {
        return call(HttpMethod.GET, url, username, null);
    }

    protected ResultActions post(String url, String username, Object body) throws Exception {
        return call(HttpMethod.POST, url, username, body);
    }

    protected long userId(String username) {
        return jdbc.queryForObject("SELECT id FROM users WHERE username = ?", Long.class, username);
    }

    protected static Map<String, Object> claimBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "MOTOR");
        body.put("market", "SG");
        body.put("policyNumber", "POL-SG-778812");
        body.put("incidentDate", LocalDate.now(ZoneOffset.UTC).minusDays(3).toString());
        body.put("location", "Orchard Road, Singapore");
        body.put("description", "Rear-ended at a traffic light. Bumper and tail light damaged.");
        body.put("estimatedAmount", 4500.00);
        return body;
    }

    /** Creates a SUBMITTED claim as the given claimant and returns its id. */
    protected long createClaim(String claimant) throws Exception {
        String body = post("/api/claims", claimant, claimBody())
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/id").asLong();
    }

    protected long assignedClaim(String claimant, String staff) throws Exception {
        long id = createClaim(claimant);
        call(HttpMethod.PUT, "/api/claims/" + id + "/assignment", MANAGER, Map.of("staffId", userId(staff)))
                .andExpect(status().isOk());
        return id;
    }

    protected long inProgressClaim(String claimant, String staff) throws Exception {
        long id = assignedClaim(claimant, staff);
        post("/api/claims/" + id + "/start", staff, null).andExpect(status().isOk());
        return id;
    }

    protected long assessedClaim(String claimant, String staff, String amount) throws Exception {
        long id = inProgressClaim(claimant, staff);
        call(HttpMethod.PATCH, "/api/claims/" + id + "/assessment", staff,
                "{\"assessedAmount\": " + amount + "}").andExpect(status().isOk());
        return id;
    }

    protected long settledClaim(String claimant, String staff) throws Exception {
        long id = assessedClaim(claimant, staff, "1000.00");
        post("/api/claims/" + id + "/settle", staff, Map.of("settledAmount", 900, "decisionNote", "Approved."))
                .andExpect(status().isOk());
        return id;
    }

    protected long rejectedClaim(String claimant, String staff) throws Exception {
        long id = inProgressClaim(claimant, staff);
        post("/api/claims/" + id + "/reject", staff, Map.of("decisionNote", "Not covered."))
                .andExpect(status().isOk());
        return id;
    }

    protected JsonNode data(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
    }

    protected String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    // ---------- envelope assertions ----------

    protected static void expectError(ResultActions result, int status, String code) throws Exception {
        result.andExpect(status().is(status))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.error.code").value(code))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }
}
