package com.chubb.claims.claim;

/** APAC markets (01 A1), each with its local currency. */
public enum Market {
    SG(Currency.SGD),
    HK(Currency.HKD),
    AU(Currency.AUD),
    MY(Currency.MYR),
    TH(Currency.THB),
    ID(Currency.IDR);

    private final Currency defaultCurrency;

    Market(Currency defaultCurrency) {
        this.defaultCurrency = defaultCurrency;
    }

    public Currency defaultCurrency() {
        return defaultCurrency;
    }
}
