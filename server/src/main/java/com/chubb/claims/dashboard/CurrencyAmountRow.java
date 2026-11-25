package com.chubb.claims.dashboard;

import com.chubb.claims.claim.Currency;

import java.math.BigDecimal;

/** Projection: a total in one currency. */
public record CurrencyAmountRow(Currency currency, BigDecimal amount) {
}
