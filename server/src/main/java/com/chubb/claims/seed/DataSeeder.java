package com.chubb.claims.seed;

import com.chubb.claims.config.AppProperties;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.Role;
import com.chubb.claims.user.RoleRepository;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Idempotent startup seeder (03 §7). Inserts each seed user whose username is missing, with a BCrypt hash of
 * app.seed.demo-password and its role looked up by roles.code. Roles and menus come from Flyway V2.
 * Sample claims (03 §7.3) come from {@link SampleClaimSeeder}, which runs after this one.
 */
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements ApplicationRunner {

    /** 03 §7.2. */
    static final List<SeedUser> SEED_USERS = List.of(
            new SeedUser("claimant1", "Alice Tan", RoleCode.CLAIMANT),
            new SeedUser("claimant2", "Ben Wong", RoleCode.CLAIMANT),
            new SeedUser("staff1", "Chris Lim", RoleCode.CLAIMS_STAFF),
            new SeedUser("staff2", "Dana Ng", RoleCode.CLAIMS_STAFF),
            new SeedUser("manager1", "Evan Lee", RoleCode.MANAGER));

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties.Seed seedProperties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int created = 0;
        for (SeedUser seed : SEED_USERS) {
            if (userRepository.existsByUsername(seed.username())) {
                continue;
            }
            Role role = roleRepository.findByCode(seed.role().name())
                    .orElseThrow(() -> new IllegalStateException("Role not found: " + seed.role()));
            userRepository.save(User.create(seed.username(),
                    passwordEncoder.encode(seedProperties.demoPassword()), seed.displayName(), role));
            created++;
        }
        if (created == 0) {
            log.info("Seed skipped, data present");
        } else {
            log.info("Seeded users count={}", created);
        }
    }

    record SeedUser(String username, String displayName, RoleCode role) {
    }
}
