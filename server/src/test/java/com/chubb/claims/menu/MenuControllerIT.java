package com.chubb.claims.menu;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MenuControllerIT {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Value("${app.seed.demo-password}")
    private String demoPassword;

    @Test
    void claimantGetsMyClaimsThenNewClaim() throws Exception {
        mvc.perform(get("/api/menu").header("Authorization", bearer("claimant1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[*].code", contains("MY_CLAIMS", "NEW_CLAIM")))
                .andExpect(jsonPath("$.data[0].label").value("My claims"))
                .andExpect(jsonPath("$.data[0].route").value("/claimant/claims"))
                .andExpect(jsonPath("$.data[0].icon").value("list"))
                .andExpect(jsonPath("$.data[0].sortOrder").value(10))
                .andExpect(jsonPath("$.data[1].route").value("/claimant/claims/new"));
    }

    @Test
    void staffGetsOnlyTheWorkQueue() throws Exception {
        mvc.perform(get("/api/menu").header("Authorization", bearer("staff1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", contains("MY_QUEUE")))
                .andExpect(jsonPath("$.data[0].route").value("/staff/queue"));
    }

    @Test
    void managerGetsDashboardThenAllClaims() throws Exception {
        mvc.perform(get("/api/menu").header("Authorization", bearer("manager1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", contains("DASHBOARD", "ALL_CLAIMS")))
                .andExpect(jsonPath("$.data[*].route", contains("/manager/dashboard", "/manager/claims")));
    }

    @Test
    void menuWithoutTokenGives401() throws Exception {
        mvc.perform(get("/api/menu"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void menuWithBadTokenGives401() throws Exception {
        mvc.perform(get("/api/menu").header("Authorization", "Bearer abc.def.ghi"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    private String bearer(String username) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", username, "password", demoPassword))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + objectMapper.readTree(body).at("/data/token").asText();
    }
}
