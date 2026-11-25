package com.chubb.claims.dashboard;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class DashboardPeriodTest {

    @ParameterizedTest(name = "{0} at {1} starts {2}")
    @CsvSource({
            "WEEK,  2026-11-25T09:30:00Z, 2026-11-23T00:00:00Z",   // Wednesday -> Monday
            "WEEK,  2026-11-23T00:00:00Z, 2026-11-23T00:00:00Z",   // Monday midnight is the start itself
            "WEEK,  2026-11-29T23:59:59Z, 2026-11-23T00:00:00Z",   // Sunday night still the same week
            "WEEK,  2026-12-01T08:00:00Z, 2026-11-30T00:00:00Z",   // crosses a month boundary
            "MONTH, 2026-11-25T09:30:00Z, 2026-11-01T00:00:00Z",
            "MONTH, 2026-12-01T00:00:00Z, 2026-12-01T00:00:00Z"})
    void calendarWindowsInUtc(DashboardPeriod period, String now, String expectedFrom) {
        assertThat(period.from(Instant.parse(now))).isEqualTo(Instant.parse(expectedFrom));
    }

    @ParameterizedTest
    @CsvSource({"2026-11-25T09:30:00Z", "2026-01-01T00:00:00Z"})
    void allHasNoStart(String now) {
        assertThat(DashboardPeriod.ALL.from(Instant.parse(now))).isNull();
    }
}
