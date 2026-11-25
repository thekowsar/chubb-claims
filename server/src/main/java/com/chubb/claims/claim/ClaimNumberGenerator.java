package com.chubb.claims.claim;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.ZoneOffset;

/** CLM-&lt;year&gt;-&lt;6-digit seq&gt; from the DB sequence claim_number_seq (03 §6). Unique across restarts. */
@Component
@RequiredArgsConstructor
public class ClaimNumberGenerator {

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public String next() {
        Long seq = jdbcTemplate.queryForObject("SELECT NEXT VALUE FOR claim_number_seq", Long.class);
        int year = clock.instant().atZone(ZoneOffset.UTC).getYear();
        return String.format("CLM-%d-%06d", year, seq);
    }
}
