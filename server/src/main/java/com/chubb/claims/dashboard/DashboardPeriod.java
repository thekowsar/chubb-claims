package com.chubb.claims.dashboard;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;

/** Reporting window (04 DashboardPeriod). Calendar periods in UTC; the window always ends now. */
public enum DashboardPeriod {
    WEEK,
    MONTH,
    ALL;

    /** Window start, or null for ALL. */
    public Instant from(Instant now) {
        LocalDate today = now.atZone(ZoneOffset.UTC).toLocalDate();
        return switch (this) {
            case WEEK -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    .atStartOfDay(ZoneOffset.UTC).toInstant();
            case MONTH -> today.withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            case ALL -> null;
        };
    }
}
