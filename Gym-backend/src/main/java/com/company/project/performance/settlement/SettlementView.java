package com.company.project.performance.settlement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Where a person's month stands: estimated (month still running) → pending (ended, undecided)
 * → approved (amount frozen) → paid; rejected earns nothing. {@code amount} is the frozen
 * amount for decided months, the live estimate otherwise.
 */
public record SettlementView(String status, BigDecimal amount, BigDecimal computedAmount, BigDecimal adjustmentAmount,
                             String note, String reviewedBy, LocalDateTime reviewedAt, LocalDateTime paidAt,
                             Long payrollRunId, Long planId) {

    public static final String ESTIMATED = "estimated";
    public static final String PENDING = "pending";
    public static final String APPROVED = "approved";
    public static final String REJECTED = "rejected";
    public static final String PAID = "paid";

    public boolean isDecided() {
        return APPROVED.equals(status) || REJECTED.equals(status) || PAID.equals(status);
    }
}
