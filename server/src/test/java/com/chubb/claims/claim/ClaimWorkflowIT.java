package com.chubb.claims.claim;

import com.chubb.claims.support.ApiTestSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Assign, start, assess, settle and reject: success, validation, forbidden, not found and every status rule. */
class ClaimWorkflowIT extends ApiTestSupport {

    @AfterEach
    void reEnableUsers() {
        jdbc.update("UPDATE users SET enabled = TRUE");
    }

    private ResultActions assign(long id, String username, Object body) throws Exception {
        return call(HttpMethod.PUT, "/api/claims/" + id + "/assignment", username, body);
    }

    private ResultActions start(long id, String username) throws Exception {
        return post("/api/claims/" + id + "/start", username, null);
    }

    private ResultActions assess(long id, String username, String amountJson) throws Exception {
        return call(HttpMethod.PATCH, "/api/claims/" + id + "/assessment", username,
                "{\"assessedAmount\": " + amountJson + "}");
    }

    private ResultActions settle(long id, String username, Object amount, String note) throws Exception {
        return post("/api/claims/" + id + "/settle", username,
                note == null ? Map.of("settledAmount", amount) : Map.of("settledAmount", amount, "decisionNote", note));
    }

    private ResultActions reject(long id, String username, String note) throws Exception {
        return post("/api/claims/" + id + "/reject", username, note == null ? Map.of() : Map.of("decisionNote", note));
    }

    @Nested
    class Assign {

        @Test
        void managerAssignsSubmittedClaim() throws Exception {
            long id = createClaim(CLAIMANT1);

            assign(id, MANAGER, Map.of("staffId", userId(STAFF1)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("ASSIGNED"))
                    .andExpect(jsonPath("$.data.assignedStaff.id").value(userId(STAFF1)))
                    .andExpect(jsonPath("$.data.assignedStaff.displayName").value("Chris Lim"))
                    .andExpect(jsonPath("$.data.assignedAt").isNotEmpty());
        }

        @Test
        void managerReassignsWhileAssigned() throws Exception {
            long id = assignedClaim(CLAIMANT1, STAFF1);

            assign(id, MANAGER, Map.of("staffId", userId(STAFF2)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("ASSIGNED"))
                    .andExpect(jsonPath("$.data.assignedStaff.displayName").value("Dana Ng"));
            get("/api/claims/" + id + "/history", MANAGER)
                    .andExpect(jsonPath("$.data[2].fromStatus").value("ASSIGNED"))
                    .andExpect(jsonPath("$.data[2].toStatus").value("ASSIGNED"))
                    .andExpect(jsonPath("$.data[2].assignedStaff.displayName").value("Dana Ng"));
            expectError(get("/api/claims/" + id, STAFF1), 403, "ACCESS_DENIED");
        }

        @Test
        void assignAfterStartOrCloseIs409() throws Exception {
            long inProgress = inProgressClaim(CLAIMANT1, STAFF1);
            expectError(assign(inProgress, MANAGER, Map.of("staffId", userId(STAFF2))), 409, "INVALID_STATUS_TRANSITION");
            assign(inProgress, MANAGER, Map.of("staffId", userId(STAFF2)))
                    .andExpect(jsonPath("$.error.message").value("Cannot move claim from IN_PROGRESS to ASSIGNED"));

            expectError(assign(settledClaim(CLAIMANT1, STAFF1), MANAGER, Map.of("staffId", userId(STAFF2))),
                    409, "INVALID_STATUS_TRANSITION");
            expectError(assign(rejectedClaim(CLAIMANT1, STAFF1), MANAGER, Map.of("staffId", userId(STAFF2))),
                    409, "INVALID_STATUS_TRANSITION");
        }

        @ParameterizedTest
        @ValueSource(strings = {CLAIMANT1, MANAGER})
        void assigningToNonStaffIs400InvalidAssignee(String target) throws Exception {
            long id = createClaim(CLAIMANT1);
            long targetId = userId(target);

            expectError(assign(id, MANAGER, Map.of("staffId", targetId)), 400, "INVALID_ASSIGNEE");
            assign(id, MANAGER, Map.of("staffId", targetId))
                    .andExpect(jsonPath("$.error.message").value("User " + targetId + " is not a claims staff member"));
        }

        @Test
        void unknownOrDisabledStaffIs400InvalidAssignee() throws Exception {
            long id = createClaim(CLAIMANT1);
            expectError(assign(id, MANAGER, Map.of("staffId", 999999)), 400, "INVALID_ASSIGNEE");

            jdbc.update("UPDATE users SET enabled = FALSE WHERE username = ?", STAFF2);
            expectError(assign(id, MANAGER, Map.of("staffId", userId(STAFF2))), 400, "INVALID_ASSIGNEE");
        }

        @Test
        void missingOrInvalidStaffIdIs400() throws Exception {
            long id = createClaim(CLAIMANT1);
            expectError(assign(id, MANAGER, Map.of()), 400, "VALIDATION_FAILED");
            assign(id, MANAGER, Map.of()).andExpect(jsonPath("$.error.details[0].field").value("staffId"));
            expectError(assign(id, MANAGER, Map.of("staffId", 0)), 400, "VALIDATION_FAILED");
        }

        @ParameterizedTest
        @ValueSource(strings = {CLAIMANT1, STAFF1})
        void onlyManagerCanAssign(String username) throws Exception {
            long id = createClaim(CLAIMANT1);
            expectError(assign(id, username, Map.of("staffId", userId(STAFF1))), 403, "ACCESS_DENIED");
        }

        @Test
        void unknownClaimIs404() throws Exception {
            expectError(assign(999999, MANAGER, Map.of("staffId", userId(STAFF1))), 404, "CLAIM_NOT_FOUND");
        }

        @Test
        void withoutTokenIs401() throws Exception {
            expectError(assign(1, null, Map.of("staffId", 3)), 401, "UNAUTHORIZED");
        }
    }

    @Nested
    class Start {

        @Test
        void assignedStaffStartsWork() throws Exception {
            long id = assignedClaim(CLAIMANT1, STAFF1);

            start(id, STAFF1)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                    .andExpect(jsonPath("$.data.startedAt").isNotEmpty());
        }

        @Test
        void otherStaffGets403() throws Exception {
            long id = assignedClaim(CLAIMANT1, STAFF1);
            expectError(start(id, STAFF2), 403, "ACCESS_DENIED");
        }

        @Test
        void startOnSubmittedClaimIs403BecauseNobodyIsAssigned() throws Exception {
            expectError(start(createClaim(CLAIMANT1), STAFF1), 403, "ACCESS_DENIED");
        }

        @Test
        void startingAgainOrAfterCloseIs409() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);
            expectError(start(id, STAFF1), 409, "INVALID_STATUS_TRANSITION");
            start(id, STAFF1).andExpect(jsonPath("$.error.message").value("Cannot move claim from IN_PROGRESS to IN_PROGRESS"));
            expectError(start(settledClaim(CLAIMANT1, STAFF1), STAFF1), 409, "INVALID_STATUS_TRANSITION");
            expectError(start(rejectedClaim(CLAIMANT1, STAFF1), STAFF1), 409, "INVALID_STATUS_TRANSITION");
        }

        @ParameterizedTest
        @ValueSource(strings = {CLAIMANT1, MANAGER})
        void onlyStaffCanStart(String username) throws Exception {
            long id = assignedClaim(CLAIMANT1, STAFF1);
            expectError(start(id, username), 403, "ACCESS_DENIED");
        }

        @Test
        void unknownClaimIs404() throws Exception {
            expectError(start(999999, STAFF1), 404, "CLAIM_NOT_FOUND");
        }
    }

    @Nested
    class Assess {

        @Test
        void assignedStaffSetsAndUpdatesTheAssessedAmount() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);

            assess(id, STAFF1, "5800.00").andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.assessedAmount").value(5800.00))
                    .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
            assess(id, STAFF1, "0").andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.assessedAmount").value(0.00));
        }

        @Test
        void invalidAmountIs400() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);
            expectError(assess(id, STAFF1, "-1"), 400, "VALIDATION_FAILED");
            assess(id, STAFF1, "-1").andExpect(jsonPath("$.error.details[0].field").value("assessedAmount"));
            expectError(assess(id, STAFF1, "1.234"), 400, "VALIDATION_FAILED");
            expectError(assess(id, STAFF1, "null"), 400, "VALIDATION_FAILED");
        }

        @Test
        void assessOutsideInProgressIs409() throws Exception {
            expectError(assess(assignedClaim(CLAIMANT1, STAFF1), STAFF1, "100"), 409, "INVALID_STATUS_TRANSITION");
            expectError(assess(settledClaim(CLAIMANT1, STAFF1), STAFF1, "100"), 409, "INVALID_STATUS_TRANSITION");
            expectError(assess(rejectedClaim(CLAIMANT1, STAFF1), STAFF1, "100"), 409, "INVALID_STATUS_TRANSITION");
        }

        @Test
        void otherStaffGets403AndOtherRolesToo() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);
            expectError(assess(id, STAFF2, "100"), 403, "ACCESS_DENIED");
            expectError(assess(id, MANAGER, "100"), 403, "ACCESS_DENIED");
            expectError(assess(id, CLAIMANT1, "100"), 403, "ACCESS_DENIED");
        }

        @Test
        void unknownClaimIs404() throws Exception {
            expectError(assess(999999, STAFF1, "100"), 404, "CLAIM_NOT_FOUND");
        }
    }

    @Nested
    class Settle {

        @Test
        void assignedStaffSettlesUpToTheAssessedAmount() throws Exception {
            long id = assessedClaim(CLAIMANT1, STAFF1, "5800.00");

            settle(id, STAFF1, 5800.00, "Approved. Repair quote verified.")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("SETTLED"))
                    .andExpect(jsonPath("$.data.settledAmount").value(5800.00))
                    .andExpect(jsonPath("$.data.assessedAmount").value(5800.00))
                    .andExpect(jsonPath("$.data.decisionNote").value("Approved. Repair quote verified."))
                    .andExpect(jsonPath("$.data.closedAt").isNotEmpty());
            get("/api/claims/" + id, CLAIMANT1)
                    .andExpect(jsonPath("$.data.status").value("SETTLED"))
                    .andExpect(jsonPath("$.data.decisionNote").value("Approved. Repair quote verified."));
        }

        @Test
        void settledAboveAssessedIs400() throws Exception {
            long id = assessedClaim(CLAIMANT1, STAFF1, "5800.00");

            expectError(settle(id, STAFF1, 5800.01, "x"), 400, "VALIDATION_FAILED");
            settle(id, STAFF1, 5800.01, "x")
                    .andExpect(jsonPath("$.error.details[0].field").value("settledAmount"))
                    .andExpect(jsonPath("$.error.details[0].message").value("must not exceed assessed amount 5800.00"));
        }

        @Test
        void settleWithoutAssessedAmountIs400() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);

            expectError(settle(id, STAFF1, 100, "x"), 400, "VALIDATION_FAILED");
            settle(id, STAFF1, 100, "x").andExpect(jsonPath("$.error.details[0].message")
                    .value("an assessed amount must be saved before settling"));
            get("/api/claims/" + id, STAFF1).andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
        }

        @Test
        void invalidBodyIs400() throws Exception {
            long id = assessedClaim(CLAIMANT1, STAFF1, "1000.00");
            expectError(settle(id, STAFF1, 0, "x"), 400, "VALIDATION_FAILED");
            expectError(settle(id, STAFF1, 100, " "), 400, "VALIDATION_FAILED");
            settle(id, STAFF1, 100, " ").andExpect(jsonPath("$.error.details[0].field").value("decisionNote"));
            expectError(settle(id, STAFF1, 100, null), 400, "VALIDATION_FAILED");
            expectError(settle(id, STAFF1, 100, "x".repeat(2001)), 400, "VALIDATION_FAILED");
        }

        @Test
        void settleOutsideInProgressIs409() throws Exception {
            expectError(settle(assignedClaim(CLAIMANT1, STAFF1), STAFF1, 100, "x"), 409, "INVALID_STATUS_TRANSITION");
            long settled = settledClaim(CLAIMANT1, STAFF1);
            expectError(settle(settled, STAFF1, 100, "x"), 409, "INVALID_STATUS_TRANSITION");
            settle(settled, STAFF1, 100, "x")
                    .andExpect(jsonPath("$.error.message").value("Cannot move claim from SETTLED to SETTLED"));
            expectError(settle(rejectedClaim(CLAIMANT1, STAFF1), STAFF1, 100, "x"), 409, "INVALID_STATUS_TRANSITION");
        }

        @Test
        void otherStaffAndOtherRolesGet403() throws Exception {
            long id = assessedClaim(CLAIMANT1, STAFF1, "1000.00");
            expectError(settle(id, STAFF2, 100, "x"), 403, "ACCESS_DENIED");
            expectError(settle(id, MANAGER, 100, "x"), 403, "ACCESS_DENIED");
            expectError(settle(id, CLAIMANT1, 100, "x"), 403, "ACCESS_DENIED");
        }

        @Test
        void unknownClaimIs404() throws Exception {
            expectError(settle(999999, STAFF1, 100, "x"), 404, "CLAIM_NOT_FOUND");
        }

        @Test
        void fullHistoryAfterSettle() throws Exception {
            long id = settledClaim(CLAIMANT1, STAFF1);
            get("/api/claims/" + id + "/history", CLAIMANT1)
                    .andExpect(jsonPath("$.data[*].toStatus").value(org.hamcrest.Matchers.contains(
                            "SUBMITTED", "ASSIGNED", "IN_PROGRESS", "SETTLED")))
                    .andExpect(jsonPath("$.data[0].assignedStaff").value(nullValue()));
        }
    }

    @Nested
    class Reject {

        @Test
        void assignedStaffRejectsWithANote() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);

            reject(id, STAFF1, "Incident occurred before the policy start date.")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("REJECTED"))
                    .andExpect(jsonPath("$.data.decisionNote").value("Incident occurred before the policy start date."))
                    .andExpect(jsonPath("$.data.settledAmount").value(nullValue()))
                    .andExpect(jsonPath("$.data.closedAt").isNotEmpty());
        }

        @Test
        void missingNoteIs400() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);
            expectError(reject(id, STAFF1, null), 400, "VALIDATION_FAILED");
            reject(id, STAFF1, null).andExpect(jsonPath("$.error.details[0].field").value("decisionNote"));
            expectError(reject(id, STAFF1, ""), 400, "VALIDATION_FAILED");
        }

        @Test
        void rejectOutsideInProgressIs409() throws Exception {
            expectError(reject(assignedClaim(CLAIMANT1, STAFF1), STAFF1, "x"), 409, "INVALID_STATUS_TRANSITION");
            long settled = settledClaim(CLAIMANT1, STAFF1);
            expectError(reject(settled, STAFF1, "x"), 409, "INVALID_STATUS_TRANSITION");
            reject(settled, STAFF1, "x")
                    .andExpect(jsonPath("$.error.message").value("Cannot move claim from SETTLED to REJECTED"));
            expectError(reject(rejectedClaim(CLAIMANT1, STAFF1), STAFF1, "x"), 409, "INVALID_STATUS_TRANSITION");
        }

        @Test
        void otherStaffAndOtherRolesGet403() throws Exception {
            long id = inProgressClaim(CLAIMANT1, STAFF1);
            expectError(reject(id, STAFF2, "x"), 403, "ACCESS_DENIED");
            expectError(reject(id, MANAGER, "x"), 403, "ACCESS_DENIED");
            expectError(reject(id, CLAIMANT1, "x"), 403, "ACCESS_DENIED");
        }

        @Test
        void unknownClaimIs404() throws Exception {
            expectError(reject(999999, STAFF1, "x"), 404, "CLAIM_NOT_FOUND");
        }
    }
}
