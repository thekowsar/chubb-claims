package com.chubb.claims.user;

import com.chubb.claims.support.ApiTestSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/users?role=... (manager only). */
class UserControllerIT extends ApiTestSupport {

    @AfterEach
    void reEnableUsers() {
        jdbc.update("UPDATE users SET enabled = TRUE");
    }

    @Test
    void managerListsStaffSortedByDisplayName() throws Exception {
        get("/api/users?role=CLAIMS_STAFF", MANAGER)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[*].displayName", contains("Chris Lim", "Dana Ng")))
                .andExpect(jsonPath("$.data[*].username", contains("staff1", "staff2")))
                .andExpect(jsonPath("$.data[*].role", everyItem(is("CLAIMS_STAFF"))))
                .andExpect(jsonPath("$.data[0].passwordHash").doesNotExist());
    }

    @Test
    void otherRolesCanBeListedToo() throws Exception {
        get("/api/users?role=CLAIMANT", MANAGER)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].displayName", contains("Alice Tan", "Ben Wong")));
    }

    @Test
    void disabledUsersAreLeftOut() throws Exception {
        jdbc.update("UPDATE users SET enabled = FALSE WHERE username = ?", STAFF1);
        get("/api/users?role=CLAIMS_STAFF", MANAGER)
                .andExpect(jsonPath("$.data[*].username", contains("staff2")));
    }

    @Test
    void missingOrInvalidRoleIs400() throws Exception {
        expectError(get("/api/users", MANAGER), 400, "VALIDATION_FAILED");
        get("/api/users", MANAGER).andExpect(jsonPath("$.error.details[0].field").value("role"));
        expectError(get("/api/users?role=ADMIN", MANAGER), 400, "VALIDATION_FAILED");
    }

    @ParameterizedTest
    @ValueSource(strings = {CLAIMANT1, STAFF1})
    void onlyManagerCanList(String username) throws Exception {
        expectError(get("/api/users?role=CLAIMS_STAFF", username), 403, "ACCESS_DENIED");
    }

    @Test
    void withoutTokenIs401() throws Exception {
        expectError(get("/api/users?role=CLAIMS_STAFF", null), 401, "UNAUTHORIZED");
    }
}
