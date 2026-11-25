package com.chubb.claims.seed;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The context only starts if Hibernate's ddl-auto=validate accepts the Flyway schema, so loading it is the
 * schema check. These tests then check the reference data (V2) and the user seeder (03 §7).
 */
@SpringBootTest
@ActiveProfiles("test")
class SchemaAndSeedIT {

    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private DataSeeder seeder;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Value("${app.seed.demo-password}")
    private String demoPassword;

    @Test
    void flywayAppliedBothMigrations() {
        List<String> versions = jdbc.queryForList(
                "SELECT \"version\" FROM \"flyway_schema_history\" WHERE \"success\" = TRUE AND \"version\" IS NOT NULL ORDER BY \"installed_rank\"",
                String.class);
        assertThat(versions).containsExactly("1", "2");
    }

    @Test
    void rolesAreTheThreeApprovedCodes() {
        assertThat(jdbc.queryForList("SELECT code FROM roles ORDER BY id", String.class))
                .containsExactly("CLAIMANT", "CLAIMS_STAFF", "MANAGER");
    }

    @Test
    void roleMenuMatchesTheDbDesignSeed() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT r.code AS role_code, m.code AS menu_code FROM role_menu rm
                JOIN roles r ON r.id = rm.role_id JOIN menus m ON m.id = rm.menu_id
                ORDER BY r.code, m.sort_order""");
        assertThat(rows).extracting(r -> r.get("ROLE_CODE") + ":" + r.get("MENU_CODE")).containsExactly(
                "CLAIMANT:MY_CLAIMS", "CLAIMANT:NEW_CLAIM",
                "CLAIMS_STAFF:MY_QUEUE",
                "MANAGER:DASHBOARD", "MANAGER:ALL_CLAIMS");
    }

    @Test
    void seedUsersExistWithRolesAndBcryptHashes() {
        List<Map<String, Object>> users = jdbc.queryForList("""
                SELECT u.username, u.display_name, r.code AS role_code, u.password_hash, u.enabled,
                       u.created_at, u.updated_at
                FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id""");

        assertThat(users).extracting(u -> u.get("USERNAME") + "|" + u.get("DISPLAY_NAME") + "|" + u.get("ROLE_CODE"))
                .containsExactly(
                        "claimant1|Alice Tan|CLAIMANT",
                        "claimant2|Ben Wong|CLAIMANT",
                        "staff1|Chris Lim|CLAIMS_STAFF",
                        "staff2|Dana Ng|CLAIMS_STAFF",
                        "manager1|Evan Lee|MANAGER");
        assertThat(users).allSatisfy(u -> {
            String hash = (String) u.get("PASSWORD_HASH");
            assertThat(hash).startsWith("$2").hasSize(60);
            assertThat(passwordEncoder.matches(demoPassword, hash)).isTrue();
            assertThat(u.get("ENABLED")).isEqualTo(true);
            assertThat(u.get("CREATED_AT")).isNotNull();
            assertThat(u.get("UPDATED_AT")).isNotNull();
        });
    }

    @Test
    void seederIsIdempotent() {
        seeder.run(new DefaultApplicationArguments());
        seeder.run(new DefaultApplicationArguments());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class)).isEqualTo(5);
    }

    @Test
    void sampleClaimsMatchTheDbDesignSeed() {
        List<Map<String, Object>> claims = jdbc.queryForList("""
                SELECT c.claim_number, cl.username AS claimant, c.type, c.market, c.currency, c.estimated_amount,
                       c.status, s.username AS staff, c.assessed_amount, c.settled_amount, c.decision_note,
                       c.created_by, c.created_at, c.closed_at
                FROM claims c JOIN users cl ON cl.id = c.claimant_id LEFT JOIN users s ON s.id = c.assigned_staff_id
                ORDER BY c.id""");

        assertThat(claims).extracting(c -> c.get("CLAIMANT") + "|" + c.get("TYPE") + "|" + c.get("MARKET") + "|"
                        + c.get("CURRENCY") + "|" + c.get("ESTIMATED_AMOUNT") + "|" + c.get("STATUS") + "|"
                        + c.get("STAFF") + "|" + c.get("ASSESSED_AMOUNT") + "|" + c.get("SETTLED_AMOUNT"))
                .containsExactly(
                        "claimant1|MOTOR|SG|SGD|4500.00|SUBMITTED|null|null|null",
                        "claimant2|PROPERTY|HK|HKD|80000.00|SUBMITTED|null|null|null",
                        "claimant1|PROPERTY|AU|AUD|12000.00|ASSIGNED|staff1|null|null",
                        "claimant2|MOTOR|MY|MYR|6200.00|IN_PROGRESS|staff1|5800.00|null",
                        "claimant1|MOTOR|SG|SGD|3000.00|IN_PROGRESS|staff2|null|null",
                        "claimant2|PROPERTY|TH|THB|150000.00|SETTLED|staff2|140000.00|135000.00",
                        "claimant1|MOTOR|ID|IDR|25000000.00|REJECTED|staff1|null|null",
                        "claimant2|MOTOR|SG|SGD|2000.00|SETTLED|staff1|2000.00|1800.00");
        assertThat(claims).extracting(c -> (String) c.get("CLAIM_NUMBER"))
                .allSatisfy(n -> assertThat(n).matches("CLM-\\d{4}-00000[1-8]"));
        assertThat(claims).allSatisfy(c -> assertThat(c.get("CREATED_BY")).isEqualTo("system"));
        assertThat(claims.subList(5, 8)).allSatisfy(c -> {
            assertThat(c.get("DECISION_NOTE")).isNotNull();
            assertThat(c.get("CLOSED_AT")).isNotNull();
        });
    }

    @Test
    void sampleClaimsAreSpreadOverTheLast30Days() {
        Integer distinctDays = jdbc.queryForObject(
                "SELECT COUNT(DISTINCT CAST(created_at AS DATE)) FROM claims", Integer.class);
        Integer withinRange = jdbc.queryForObject(
                "SELECT COUNT(*) FROM claims WHERE created_at >= DATEADD('DAY', -31, CURRENT_TIMESTAMP)", Integer.class);
        assertThat(distinctDays).isGreaterThan(5);
        assertThat(withinRange).isEqualTo(8);
    }

    @Test
    void eachSampleClaimHasHistoryMatchingItsPathAndClaim4HasTwoMessages() {
        List<String> paths = jdbc.queryForList("""
                SELECT LISTAGG(h.to_status, '>') WITHIN GROUP (ORDER BY h.changed_at, h.id)
                FROM claim_status_history h GROUP BY h.claim_id ORDER BY h.claim_id""", String.class);
        assertThat(paths).containsExactly(
                "SUBMITTED",
                "SUBMITTED",
                "SUBMITTED>ASSIGNED",
                "SUBMITTED>ASSIGNED>IN_PROGRESS",
                "SUBMITTED>ASSIGNED>IN_PROGRESS",
                "SUBMITTED>ASSIGNED>IN_PROGRESS>SETTLED",
                "SUBMITTED>ASSIGNED>IN_PROGRESS>REJECTED",
                "SUBMITTED>ASSIGNED>IN_PROGRESS>SETTLED");
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM claim_messages m JOIN claims c ON c.id = m.claim_id
                WHERE c.claim_number LIKE '%000004'""", Integer.class)).isEqualTo(2);
    }

    @Test
    void sampleClaimSeederIsIdempotent(@Autowired SampleClaimSeeder claimSeeder) {
        claimSeeder.run(new DefaultApplicationArguments());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM claims", Integer.class)).isEqualTo(8);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM claim_messages", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM claim_status_history", Integer.class)).isEqualTo(22);
    }
}
