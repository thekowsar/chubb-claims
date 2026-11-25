package com.chubb.claims.claim;

import com.chubb.claims.support.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST/GET /api/claims, GET /api/claims/{id}, GET /api/claims/{id}/history. */
class ClaimControllerIT extends ApiTestSupport {

    // ---------- POST /api/claims ----------

    @Test
    void claimantCreatesClaimWith201LocationAndDefaultCurrency() throws Exception {
        var result = post("/api/claims", CLAIMANT1, claimBody())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.claimNumber", matchesPattern("^CLM-\\d{4}-\\d{6}$")))
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data.type").value("MOTOR"))
                .andExpect(jsonPath("$.data.market").value("SG"))
                .andExpect(jsonPath("$.data.currency").value("SGD"))
                .andExpect(jsonPath("$.data.estimatedAmount").value(4500.00))
                .andExpect(jsonPath("$.data.claimant.id").value(userId(CLAIMANT1)))
                .andExpect(jsonPath("$.data.claimant.displayName").value("Alice Tan"))
                .andExpect(jsonPath("$.data.assignedStaff").value(nullValue()))
                .andExpect(jsonPath("$.data.assessedAmount").value(nullValue()))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.closedAt").value(nullValue()));
        long id = data(result).get("id").asLong();
        result.andExpect(header().string("Location", "/api/claims/" + id));

        get("/api/claims/" + id + "/history", CLAIMANT1)
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].fromStatus").value(nullValue()))
                .andExpect(jsonPath("$.data[0].toStatus").value("SUBMITTED"))
                .andExpect(jsonPath("$.data[0].changedBy.displayName").value("Alice Tan"));
    }

    @Test
    void claimantIdInTheBodyIsIgnored() throws Exception {
        Map<String, Object> body = claimBody();
        body.put("claimantId", userId(CLAIMANT2));
        body.put("status", "SETTLED");

        post("/api/claims", CLAIMANT1, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.claimant.id").value(userId(CLAIMANT1)))
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"));
    }

    @Test
    void explicitCurrencyIsKept() throws Exception {
        Map<String, Object> body = claimBody();
        body.put("market", "MY");
        body.put("currency", "SGD");
        post("/api/claims", CLAIMANT1, body).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.currency").value("SGD"));
    }

    @Test
    void missingFieldsGive400WithEveryField() throws Exception {
        expectError(post("/api/claims", CLAIMANT1, "{}"), 400, "VALIDATION_FAILED");
        post("/api/claims", CLAIMANT1, "{}")
                .andExpect(jsonPath("$.error.message").value("Request validation failed"))
                .andExpect(jsonPath("$.error.details[*].field", is(java.util.List.of(
                        "description", "estimatedAmount", "incidentDate", "location", "market",
                        "policyNumber", "type"))));
    }

    @ParameterizedTest(name = "{0}={1} -> {2}")
    @CsvSource(delimiter = '|', value = {
            "estimatedAmount|0|must be greater than 0",
            "estimatedAmount|-5|must be greater than 0",
            "estimatedAmount|10.123|numeric value out of bounds (<13 digits>.<2 digits> expected)",
            "description|too short|size must be between 10 and 2000",
            "policyNumber|'   '|must not be blank",
            "type|BOAT|has an invalid value",
            "market|XX|has an invalid value",
            "incidentDate|not-a-date|has an invalid value"})
    void invalidFieldGives400WithDetail(String field, String value, String message) throws Exception {
        Map<String, Object> body = claimBody();
        body.put(field, field.equals("estimatedAmount") ? new java.math.BigDecimal(value) : value);

        expectError(post("/api/claims", CLAIMANT1, body), 400, "VALIDATION_FAILED");
        post("/api/claims", CLAIMANT1, body)
                .andExpect(jsonPath("$.error.details[0].field").value(field))
                .andExpect(jsonPath("$.error.details[0].message").value(message));
    }

    @Test
    void futureIncidentDateGives400() throws Exception {
        Map<String, Object> body = claimBody();
        body.put("incidentDate", LocalDate.now(ZoneOffset.UTC).plusDays(1).toString());

        post("/api/claims", CLAIMANT1, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].field").value("incidentDate"))
                .andExpect(jsonPath("$.error.details[0].message").value("must not be in the future"));
    }

    @Test
    void todayIsAnAllowedIncidentDate() throws Exception {
        Map<String, Object> body = claimBody();
        body.put("incidentDate", LocalDate.now(ZoneOffset.UTC).toString());
        post("/api/claims", CLAIMANT1, body).andExpect(status().isCreated());
    }

    @ParameterizedTest
    @ValueSource(strings = {STAFF1, MANAGER})
    void onlyClaimantsCanCreateEvenWithAnInvalidBody(String username) throws Exception {
        expectError(post("/api/claims", username, claimBody()), 403, "ACCESS_DENIED");
        expectError(post("/api/claims", username, "{}"), 403, "ACCESS_DENIED");
    }

    @Test
    void createWithoutTokenIs401() throws Exception {
        expectError(post("/api/claims", null, claimBody()), 401, "UNAUTHORIZED");
    }

    // ---------- GET /api/claims ----------

    @Test
    void claimantSeesOnlyOwnClaims() throws Exception {
        createClaim(CLAIMANT2);
        get("/api/claims?size=100", CLAIMANT1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].claimant.id", everyItem(is((int) userId(CLAIMANT1)))));
    }

    @Test
    void staffSeesOnlyClaimsAssignedToThem() throws Exception {
        assignedClaim(CLAIMANT1, STAFF2);
        get("/api/claims?size=100", STAFF1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].assignedStaff.id", everyItem(is((int) userId(STAFF1)))));
    }

    @Test
    void managerSeesAllClaims() throws Exception {
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM claims", Long.class);
        get("/api/claims", MANAGER)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(total))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20));
    }

    @Test
    void filtersCombineWithAnd() throws Exception {
        get("/api/claims?status=SUBMITTED&status=SETTLED&market=SG&type=MOTOR&size=100", MANAGER)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].market", everyItem(is("SG"))))
                .andExpect(jsonPath("$.data.items[*].type", everyItem(is("MOTOR"))))
                .andExpect(jsonPath("$.data.items[*].status",
                        everyItem(org.hamcrest.Matchers.oneOf("SUBMITTED", "SETTLED"))));
    }

    @Test
    void claimantStatusFilterStaysInsideTheirScope() throws Exception {
        get("/api/claims?status=SETTLED&size=100", CLAIMANT1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].claimant.id", everyItem(is((int) userId(CLAIMANT1)))));
    }

    @Test
    void submittedDateRangeIsInclusiveOfBothDays() throws Exception {
        long id = createClaim(CLAIMANT1);
        String today = LocalDate.now(ZoneOffset.UTC).toString();

        JsonNode page = data(get("/api/claims?submittedFrom=" + today + "&submittedTo=" + today + "&size=100", MANAGER)
                .andExpect(status().isOk()));
        assertThat(page.get("items").findValuesAsText("id")).contains(String.valueOf(id));

        String yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1).toString();
        JsonNode before = data(get("/api/claims?submittedTo=" + yesterday + "&size=100", MANAGER));
        assertThat(before.get("items").findValuesAsText("id")).doesNotContain(String.valueOf(id));
    }

    @Test
    void paginationAndSorting() throws Exception {
        JsonNode page = data(get("/api/claims?page=0&size=2&sort=claimNumber,asc", MANAGER)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items", hasSize(2)))
                .andExpect(jsonPath("$.data.size").value(2)));
        assertThat(page.get("totalPages").asInt()).isEqualTo((int) Math.ceil(page.get("totalElements").asLong() / 2.0));
        String first = page.get("items").get(0).get("claimNumber").asText();
        String second = page.get("items").get(1).get("claimNumber").asText();
        assertThat(first).isLessThan(second);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "status=FOO|status",
            "market=XX|market",
            "type=BOAT|type",
            "size=500|size",
            "size=0|size",
            "page=-1|page",
            "sort=description,asc|sort",
            "sort=createdAt|sort",
            "submittedFrom=2026-13-01|submittedFrom",
            "submittedFrom=2026-11-30&submittedTo=2026-11-01|submittedTo"})
    void invalidQueryGives400(String query, String field) throws Exception {
        expectError(get("/api/claims?" + query, MANAGER), 400, "VALIDATION_FAILED");
        get("/api/claims?" + query, MANAGER).andExpect(jsonPath("$.error.details[0].field").value(field));
    }

    @Test
    void listWithoutTokenIs401() throws Exception {
        expectError(get("/api/claims", null), 401, "UNAUTHORIZED");
    }

    // ---------- GET /api/claims/{id} ----------

    @Test
    void detailVisibilityByRole() throws Exception {
        long id = assignedClaim(CLAIMANT1, STAFF1);

        get("/api/claims/" + id, CLAIMANT1).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.description").isNotEmpty())
                .andExpect(jsonPath("$.data.assignedStaff.displayName").value("Chris Lim"));
        get("/api/claims/" + id, STAFF1).andExpect(status().isOk());
        get("/api/claims/" + id, MANAGER).andExpect(status().isOk());
    }

    @Test
    void anotherClaimantGets404SoTheClaimStaysHidden() throws Exception {
        long id = createClaim(CLAIMANT1);
        expectError(get("/api/claims/" + id, CLAIMANT2), 404, "CLAIM_NOT_FOUND");
        get("/api/claims/" + id, CLAIMANT2).andExpect(jsonPath("$.error.message").value("Claim " + id + " not found"));
    }

    @Test
    void staffNotAssignedGets403() throws Exception {
        long id = assignedClaim(CLAIMANT1, STAFF1);
        expectError(get("/api/claims/" + id, STAFF2), 403, "ACCESS_DENIED");
        long unassigned = createClaim(CLAIMANT1);
        expectError(get("/api/claims/" + unassigned, STAFF1), 403, "ACCESS_DENIED");
    }

    @Test
    void unknownOrMalformedIdGives404Or400() throws Exception {
        expectError(get("/api/claims/999999", MANAGER), 404, "CLAIM_NOT_FOUND");
        get("/api/claims/999999", MANAGER).andExpect(jsonPath("$.error.message").value("Claim 999999 not found"));
        expectError(get("/api/claims/abc", MANAGER), 400, "VALIDATION_FAILED");
    }

    // ---------- GET /api/claims/{id}/history ----------

    @Test
    void historyIsOldestFirstWithActorsAndStaff() throws Exception {
        long id = rejectedClaim(CLAIMANT1, STAFF1);

        get("/api/claims/" + id + "/history", CLAIMANT1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].toStatus", is(java.util.List.of(
                        "SUBMITTED", "ASSIGNED", "IN_PROGRESS", "REJECTED"))))
                .andExpect(jsonPath("$.data[1].fromStatus").value("SUBMITTED"))
                .andExpect(jsonPath("$.data[1].changedBy.displayName").value("Evan Lee"))
                .andExpect(jsonPath("$.data[1].assignedStaff.displayName").value("Chris Lim"))
                .andExpect(jsonPath("$.data[3].changedBy.displayName").value("Chris Lim"));
    }

    @Test
    void historyFollowsTheSameAccessRules() throws Exception {
        long id = assignedClaim(CLAIMANT1, STAFF1);
        expectError(get("/api/claims/" + id + "/history", CLAIMANT2), 404, "CLAIM_NOT_FOUND");
        expectError(get("/api/claims/" + id + "/history", STAFF2), 403, "ACCESS_DENIED");
        get("/api/claims/" + id + "/history", MANAGER).andExpect(status().isOk());
        expectError(get("/api/claims/999999/history", MANAGER), 404, "CLAIM_NOT_FOUND");
    }
}
