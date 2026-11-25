package com.chubb.claims.dashboard;

import com.chubb.claims.claim.Currency;
import com.chubb.claims.claim.Market;

import java.math.BigDecimal;

/** Projection: outstanding liability for one market and currency (01 §5.3). */
public record LiabilityRow(Market market, Currency currency, BigDecimal amount, Long openClaimCount) {
}
