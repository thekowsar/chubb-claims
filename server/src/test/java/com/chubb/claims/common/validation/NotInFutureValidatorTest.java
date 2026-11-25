package com.chubb.claims.common.validation;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class NotInFutureValidatorTest {

    private final NotInFutureValidator validator = new NotInFutureValidator();

    @Test
    void todayAndPastAreValidTomorrowIsNot() {
        validator.setClock(Clock.fixed(Instant.parse("2026-11-25T23:30:00Z"), ZoneOffset.UTC));

        assertThat(validator.isValid(LocalDate.parse("2026-11-25"), null)).isTrue();
        assertThat(validator.isValid(LocalDate.parse("2026-01-01"), null)).isTrue();
        assertThat(validator.isValid(LocalDate.parse("2026-11-26"), null)).isFalse();
        assertThat(validator.isValid(null, null)).isTrue();
    }

    @Test
    void todayIsTheUtcDateEvenWhenTheClockHasAnotherZone() {
        // 2026-11-26 02:00 in Singapore is still 2026-11-25 in UTC
        validator.setClock(Clock.fixed(Instant.parse("2026-11-25T18:00:00Z"), ZoneOffset.ofHours(8)));

        assertThat(validator.isValid(LocalDate.parse("2026-11-26"), null)).isFalse();
        assertThat(validator.isValid(LocalDate.parse("2026-11-25"), null)).isTrue();
    }
}
