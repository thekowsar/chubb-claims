package com.chubb.claims.seed;

import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/** Fails startup if a Java {@link RoleCode} has no row in {@code roles} (03 §2). Runs before the seeder. */
@Slf4j
@Component
@Order(10)
@RequiredArgsConstructor
public class RoleCodeStartupCheck implements ApplicationRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(ApplicationArguments args) {
        List<String> missing = Arrays.stream(RoleCode.values())
                .map(Enum::name)
                .filter(code -> !roleRepository.existsByCode(code))
                .toList();
        if (!missing.isEmpty()) {
            log.error("Role codes missing from roles table codes={}", missing);
            throw new IllegalStateException("Role codes missing from roles table: " + missing);
        }
        log.info("Role codes verified count={}", RoleCode.values().length);
    }
}
