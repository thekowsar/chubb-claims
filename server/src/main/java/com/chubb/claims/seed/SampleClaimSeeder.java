package com.chubb.claims.seed;

import com.chubb.claims.claim.Claim;
import com.chubb.claims.claim.ClaimMessage;
import com.chubb.claims.claim.ClaimMessageRepository;
import com.chubb.claims.claim.ClaimNumberGenerator;
import com.chubb.claims.claim.ClaimRepository;
import com.chubb.claims.claim.ClaimStatus;
import com.chubb.claims.claim.ClaimStatusHistory;
import com.chubb.claims.claim.ClaimStatusHistoryRepository;
import com.chubb.claims.claim.ClaimType;
import com.chubb.claims.claim.Market;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Inserts the eight sample claims from 03 §7.3, with their history and messages, only when the claims table
 * is empty (idempotent). created_at values are spread over the last 30 days so the date filter and the
 * dashboard period have something to show. All text is fictional demo content.
 */
@Slf4j
@Component
@Order(30)
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SampleClaimSeeder implements ApplicationRunner {

    private final ClaimRepository claimRepository;
    private final ClaimStatusHistoryRepository historyRepository;
    private final ClaimMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ClaimNumberGenerator numberGenerator;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    /** Claim to days-ago of submission and of its last change, for backdating. */
    private final Map<Claim, Integer> created = new LinkedHashMap<>();
    private final Map<Claim, Integer> touched = new HashMap<>();
    private Instant now;
    private User manager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (claimRepository.count() > 0) {
            log.info("Sample claims skipped, claims present");
            return;
        }
        now = clock.instant();
        created.clear();
        touched.clear();
        manager = user("manager1");
        User claimant1 = user("claimant1");
        User claimant2 = user("claimant2");
        User staff1 = user("staff1");
        User staff2 = user("staff2");

        // 1. SUBMITTED, unassigned
        submitted(claimant1, ClaimType.MOTOR, Market.SG, "4500.00", 2,
                "POL-SG-100231", "Orchard Road, Singapore", "Rear-ended at a traffic light. Bumper and tail light damaged.");
        // 2. SUBMITTED, unassigned
        submitted(claimant2, ClaimType.PROPERTY, Market.HK, "80000.00", 3,
                "POL-HK-200417", "Mong Kok, Hong Kong", "Typhoon damage to windows and the balcony door of the flat.");
        // 3. ASSIGNED to staff1
        Claim c3 = submitted(claimant1, ClaimType.PROPERTY, Market.AU, "12000.00", 6,
                "POL-AU-300552", "Surry Hills, Sydney", "Hail storm damaged the roof tiles and the skylight.");
        assign(c3, staff1, 5);
        // 4. IN_PROGRESS with staff1, assessed 5,800, two messages
        Claim c4 = submitted(claimant2, ClaimType.MOTOR, Market.MY, "6200.00", 14,
                "POL-MY-400871", "Jalan Ampang, Kuala Lumpur", "Side collision in a car park. Driver door and mirror damaged.");
        assign(c4, staff1, 13);
        start(c4, staff1, 12);
        c4.assess(new BigDecimal("5800.00"));
        message(c4, staff1, "Please send the workshop repair quote reference number.", 8);
        message(c4, claimant2, "The quote reference is WS-88412.", 7);
        // 5. IN_PROGRESS with staff2, no assessment (liability uses the estimate)
        Claim c5 = submitted(claimant1, ClaimType.MOTOR, Market.SG, "3000.00", 10,
                "POL-SG-100232", "Tampines Avenue, Singapore", "Windscreen cracked by debris from a lorry on the expressway.");
        assign(c5, staff2, 9);
        start(c5, staff2, 8);
        // 6. SETTLED by staff2
        Claim c6 = submitted(claimant2, ClaimType.PROPERTY, Market.TH, "150000.00", 27,
                "POL-TH-600044", "Sukhumvit, Bangkok", "Water damage from a burst pipe in the kitchen.");
        assign(c6, staff2, 26);
        start(c6, staff2, 25);
        c6.assess(new BigDecimal("140000.00"));
        close(c6, staff2, 13, c -> c.settle(new BigDecimal("135000.00"),
                "Covered under section 2. Deductible applied.", at(13)));
        // 7. REJECTED by staff1
        Claim c7 = submitted(claimant1, ClaimType.MOTOR, Market.ID, "25000000.00", 20,
                "POL-ID-700318", "Kemang, Jakarta", "Engine damage after driving through a flooded street.");
        assign(c7, staff1, 19);
        start(c7, staff1, 18);
        close(c7, staff1, 15, c -> c.reject("Flood damage to the engine is excluded under the policy terms.", at(15)));
        // 8. SETTLED by staff1
        Claim c8 = submitted(claimant2, ClaimType.MOTOR, Market.SG, "2000.00", 29,
                "POL-SG-100233", "Bukit Timah Road, Singapore", "Scratched rear door from a shopping trolley in a car park.");
        assign(c8, staff1, 28);
        start(c8, staff1, 27);
        c8.assess(new BigDecimal("2000.00"));
        close(c8, staff1, 22, c -> c.settle(new BigDecimal("1800.00"),
                "Approved. Excess of SGD 200 applied.", at(22)));

        claimRepository.flush();
        backdate();
        log.info("Seeded claims count={} messages={}", claimRepository.count(), messageRepository.count());
    }

    private Claim submitted(User claimant, ClaimType type, Market market, String estimate, int daysAgo,
                            String policy, String location, String description) {
        Claim claim = Claim.submit(numberGenerator.next(), type, market, policy,
                LocalDate.ofInstant(at(daysAgo + 1), ZoneOffset.UTC), location, description,
                new BigDecimal(estimate), market.defaultCurrency(), claimant);
        claim = claimRepository.save(claim);
        historyRepository.save(ClaimStatusHistory.record(claim, null, claimant, at(daysAgo)));
        created.put(claim, daysAgo);
        return claim;
    }

    private void assign(Claim claim, User staff, int daysAgo) {
        claim.assignTo(staff, at(daysAgo));
        historyRepository.save(ClaimStatusHistory.record(claim, ClaimStatus.SUBMITTED, manager, at(daysAgo)));
        touched.put(claim, daysAgo);
    }

    private void start(Claim claim, User staff, int daysAgo) {
        claim.start(at(daysAgo));
        historyRepository.save(ClaimStatusHistory.record(claim, ClaimStatus.ASSIGNED, staff, at(daysAgo)));
        touched.put(claim, daysAgo);
    }

    private void close(Claim claim, User staff, int daysAgo, Consumer<Claim> action) {
        action.accept(claim);
        historyRepository.save(ClaimStatusHistory.record(claim, ClaimStatus.IN_PROGRESS, staff, at(daysAgo)));
        touched.put(claim, daysAgo);
    }

    private void message(Claim claim, User author, String body, int daysAgo) {
        messageRepository.save(ClaimMessage.create(claim, author, body, at(daysAgo)));
    }

    /** Auditing stamps "now" on insert; move created_at / updated_at back to the demo timeline. */
    private void backdate() {
        created.forEach((claim, daysAgo) -> {
            int lastChange = touched.getOrDefault(claim, daysAgo);
            jdbcTemplate.update("UPDATE claims SET created_at = ?, updated_at = ? WHERE id = ?",
                    at(daysAgo).atOffset(ZoneOffset.UTC), at(lastChange).atOffset(ZoneOffset.UTC), claim.getId());
        });
    }

    private Instant at(int daysAgo) {
        return now.minus(Duration.ofDays(daysAgo));
    }

    private User user(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Seed user missing: " + username));
    }

}
