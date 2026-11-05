package com.company.project.performance.metric;

import java.math.BigDecimal;

/** What was done on one metric in a period: count (net of reversals) and money (null for count-only metrics). */
public record Achieved(long count, BigDecimal amount) {

    public static final Achieved ZERO = new Achieved(0, null);

    public BigDecimal amountOrZero() {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    public BigDecimal value(Measure measure) {
        return measure == Measure.COUNT ? BigDecimal.valueOf(count) : amountOrZero();
    }

    public Achieved plus(long moreCount, BigDecimal moreAmount) {
        BigDecimal sum = amount == null && moreAmount == null ? null : amountOrZero().add(moreAmount != null ? moreAmount : BigDecimal.ZERO);
        return new Achieved(count + moreCount, sum);
    }
}
