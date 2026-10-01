package com.company.project.services;

import com.company.project.entities.Receipt;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StaffProgressCalculatorReceivedAmountTest {

    private static Receipt receipt(String status, String amount, String paidAmount) {
        Receipt r = new Receipt();
        r.setStatus(status);
        r.setAmount(amount != null ? new BigDecimal(amount) : null);
        r.setPaidAmount(paidAmount != null ? new BigDecimal(paidAmount) : null);
        return r;
    }

    @Test
    void partPaymentCountsOnlyThePaidPortion() {
        assertEquals(new BigDecimal("3000"), StaffProgressCalculator.receivedAmount(receipt("Partial", "5000", "3000")));
    }

    @Test
    void fullyPaidReceiptCountsItsPaidAmount() {
        assertEquals(new BigDecimal("5000"), StaffProgressCalculator.receivedAmount(receipt("Paid", "5000", "5000")));
    }

    @Test
    void settledBillKeepsItsFirstPaymentSoInstalmentsAreNotDoubleCounted() {
        // Original bill flips to "Paid" once settled but keeps its first paidAmount; the later
        // instalment is its own settlement receipt, counted separately.
        assertEquals(new BigDecimal("3000"), StaffProgressCalculator.receivedAmount(receipt("Paid", "5000", "3000")));
    }

    @Test
    void legacyRowWithoutPaidAmountOnlyFallsBackToAmountWhenFullyPaid() {
        assertEquals(new BigDecimal("5000"), StaffProgressCalculator.receivedAmount(receipt("Paid", "5000", null)));
        assertEquals(BigDecimal.ZERO, StaffProgressCalculator.receivedAmount(receipt("Partial", "5000", null)));
    }

    @Test
    void revenueStatusesIncludePartPaymentsButNotPending() {
        assertTrue(StaffProgressCalculator.REVENUE_RECEIPT_STATUSES.contains("Partial"));
        assertTrue(StaffProgressCalculator.REVENUE_RECEIPT_STATUSES.contains("Paid"));
        assertTrue(!StaffProgressCalculator.REVENUE_RECEIPT_STATUSES.contains("Pending"));
    }
}
