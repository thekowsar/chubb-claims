package com.chubb.claims.claim;

import com.chubb.claims.support.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET and POST /api/claims/{id}/messages. */
class ClaimMessageControllerIT extends ApiTestSupport {

    private ResultActions send(long id, String username, String body) throws Exception {
        return post("/api/claims/" + id + "/messages", username, body == null ? Map.of() : Map.of("body", body));
    }

    @Test
    void claimantAndAssignedStaffExchangeMessagesOldestFirst() throws Exception {
        long id = inProgressClaim(CLAIMANT1, STAFF1);

        send(id, STAFF1, "Please upload the workshop repair quote reference number.")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.author.displayName").value("Chris Lim"))
                .andExpect(jsonPath("$.data.authorRole").value("CLAIMS_STAFF"))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty());
        send(id, CLAIMANT1, "The quote reference is WS-88412.")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.authorRole").value("CLAIMANT"));

        get("/api/claims/" + id + "/messages", CLAIMANT1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[*].authorRole", contains("CLAIMS_STAFF", "CLAIMANT")))
                .andExpect(jsonPath("$.data[1].body").value("The quote reference is WS-88412."));
    }

    @Test
    void messagesStayReadableAfterCloseForEveryoneWhoCanSeeTheClaim() throws Exception {
        long id = inProgressClaim(CLAIMANT1, STAFF1);
        send(id, STAFF1, "Question").andExpect(status().isCreated());
        post("/api/claims/" + id + "/reject", STAFF1, Map.of("decisionNote", "Not covered.")).andExpect(status().isOk());

        get("/api/claims/" + id + "/messages", CLAIMANT1).andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(1)));
        get("/api/claims/" + id + "/messages", STAFF1).andExpect(status().isOk());
        get("/api/claims/" + id + "/messages", MANAGER).andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(1)));
    }

    @Test
    void emptyThreadIsAnEmptyList() throws Exception {
        long id = createClaim(CLAIMANT1);
        get("/api/claims/" + id + "/messages", CLAIMANT1).andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void sendingOutsideInProgressIs409MessagingNotAllowed() throws Exception {
        expectError(send(createClaim(CLAIMANT1), CLAIMANT1, "hi"), 409, "MESSAGING_NOT_ALLOWED");
        expectError(send(assignedClaim(CLAIMANT1, STAFF1), STAFF1, "hi"), 409, "MESSAGING_NOT_ALLOWED");
        expectError(send(settledClaim(CLAIMANT1, STAFF1), CLAIMANT1, "hi"), 409, "MESSAGING_NOT_ALLOWED");
        long rejected = rejectedClaim(CLAIMANT1, STAFF1);
        expectError(send(rejected, STAFF1, "hi"), 409, "MESSAGING_NOT_ALLOWED");
        send(rejected, STAFF1, "hi").andExpect(jsonPath("$.error.message")
                .value("Messages can only be sent while the claim is IN_PROGRESS"));
    }

    @Test
    void managerCannotSendEvenWithAnInvalidBody() throws Exception {
        long id = inProgressClaim(CLAIMANT1, STAFF1);
        expectError(send(id, MANAGER, "hi"), 403, "ACCESS_DENIED");
        expectError(send(id, MANAGER, null), 403, "ACCESS_DENIED");
    }

    @Test
    void otherClaimantGets404AndUnassignedStaffGets403() throws Exception {
        long id = inProgressClaim(CLAIMANT1, STAFF1);
        expectError(send(id, CLAIMANT2, "hi"), 404, "CLAIM_NOT_FOUND");
        expectError(get("/api/claims/" + id + "/messages", CLAIMANT2), 404, "CLAIM_NOT_FOUND");
        expectError(send(id, STAFF2, "hi"), 403, "ACCESS_DENIED");
        expectError(get("/api/claims/" + id + "/messages", STAFF2), 403, "ACCESS_DENIED");
    }

    @Test
    void invalidBodyIs400() throws Exception {
        long id = inProgressClaim(CLAIMANT1, STAFF1);
        expectError(send(id, CLAIMANT1, null), 400, "VALIDATION_FAILED");
        send(id, CLAIMANT1, null).andExpect(jsonPath("$.error.details[0].field").value("body"));
        expectError(send(id, CLAIMANT1, "  "), 400, "VALIDATION_FAILED");
        expectError(send(id, CLAIMANT1, "x".repeat(2001)), 400, "VALIDATION_FAILED");
        send(id, CLAIMANT1, "x".repeat(2000)).andExpect(status().isCreated());
    }

    @Test
    void unknownClaimIs404() throws Exception {
        expectError(get("/api/claims/999999/messages", MANAGER), 404, "CLAIM_NOT_FOUND");
        expectError(send(999999, CLAIMANT1, "hi"), 404, "CLAIM_NOT_FOUND");
    }

    @Test
    void withoutTokenIs401() throws Exception {
        expectError(get("/api/claims/1/messages", null), 401, "UNAUTHORIZED");
        expectError(send(1, null, "hi"), 401, "UNAUTHORIZED");
    }
}
