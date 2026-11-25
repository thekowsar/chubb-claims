package com.chubb.claims.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Spring creates this validator and injects the app {@link Clock}, so "today" is the UTC date and tests can
 * fix the clock. Falls back to the system UTC clock when created outside Spring.
 */
public class NotInFutureValidator implements ConstraintValidator<NotInFuture, LocalDate> {

    private Clock clock = Clock.systemUTC();

    @Autowired(required = false)
    public void setClock(Clock clock) {
        this.clock = clock;
    }

    @Override
    public boolean isValid(LocalDate value, ConstraintValidatorContext context) {
        return value == null || !value.isAfter(LocalDate.now(clock.withZone(ZoneOffset.UTC)));
    }
}
