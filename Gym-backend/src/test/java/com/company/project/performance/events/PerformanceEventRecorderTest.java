package com.company.project.performance.events;

import com.company.project.performance.metric.Metric;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** The ledger's correction rules (PerformanceEventRecorder.plan is pure). */
class PerformanceEventRecorderTest {

    private static final LocalDateTime SOLD = LocalDateTime.of(2026, 9, 14, 10, 0);
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 12, 0);
    private static final PerformanceEventRecorder.FrozenCheck OPEN = (s, t, b) -> false;
    private static final PerformanceEventRecorder.FrozenCheck DECIDED = (s, t, b) -> true;

    private static Credit sale(Long staff, String amount) {
        return new Credit(Metric.POS_SALE, staff, 1L, SOLD, 1, new BigDecimal(amount));
    }

    /** Applies the planned rows, giving them ids like the database would. */
    private static List<PerformanceEvent> apply(List<PerformanceEvent> ledger, List<PerformanceEvent> rows) {
        List<PerformanceEvent> out = new ArrayList<>(ledger);
        long id = 100 + ledger.size();
        for (PerformanceEvent e : rows) {
            e.setId(id++);
            out.add(e);
        }
        return out;
    }

    @Test
    void firstCreditIsTheOriginal() {
        List<PerformanceEvent> rows = PerformanceEventRecorder.plan("sale", 9L, List.of(sale(5L, "1000")), List.of(), NOW, OPEN);
        assertEquals(1, rows.size());
        PerformanceEvent e = rows.get(0);
        assertEquals(0, e.getRevision());
        assertEquals(SOLD, e.getOccurredAt());
        assertEquals(1, e.getQuantity());
        assertEquals(0, new BigDecimal("1000").compareTo(e.getAmount()));
    }

    @Test
    void reconcilingAnUnchangedRowWritesNothing() {
        List<PerformanceEvent> ledger = apply(List.of(), PerformanceEventRecorder.plan("sale", 9L, List.of(sale(5L, "1000")), List.of(), NOW, OPEN));
        assertTrue(PerformanceEventRecorder.plan("sale", 9L, List.of(sale(5L, "1000")), ledger, NOW, OPEN).isEmpty());
    }

    @Test
    void partialRefundInAnOpenMonthCorrectsThatMonth() {
        List<PerformanceEvent> ledger = apply(List.of(), PerformanceEventRecorder.plan("sale", 9L, List.of(sale(5L, "1000")), List.of(), NOW, OPEN));
        List<PerformanceEvent> rows = PerformanceEventRecorder.plan("sale", 9L, List.of(sale(5L, "600")), ledger, NOW, OPEN);
        assertEquals(1, rows.size());
        PerformanceEvent c = rows.get(0);
        assertEquals(1, c.getRevision());
        assertEquals(0, c.getQuantity());
        assertEquals(0, new BigDecimal("-400").compareTo(c.getAmount()));
        assertEquals(SOLD, c.getOccurredAt());
        assertEquals(ledger.get(0).getId(), c.getReversesEventId());
    }

    @Test
    void refundAfterApprovalIsAClawbackNow() {
        List<PerformanceEvent> ledger = apply(List.of(), PerformanceEventRecorder.plan("sale", 9L, List.of(sale(5L, "1000")), List.of(), NOW, OPEN));
        List<PerformanceEvent> rows = PerformanceEventRecorder.plan("sale", 9L, List.of(), ledger, NOW, DECIDED);
        assertEquals(1, rows.size());
        assertEquals(-1, rows.get(0).getQuantity());
        assertEquals(0, new BigDecimal("-1000").compareTo(rows.get(0).getAmount()));
        assertEquals(NOW, rows.get(0).getOccurredAt());
    }

    @Test
    void reassigningMovesTheCredit() {
        List<PerformanceEvent> ledger = apply(List.of(), PerformanceEventRecorder.plan("sale", 9L, List.of(sale(5L, "1000")), List.of(), NOW, OPEN));
        List<PerformanceEvent> rows = PerformanceEventRecorder.plan("sale", 9L, List.of(sale(6L, "1000")), ledger, NOW, OPEN);
        assertEquals(2, rows.size());
        PerformanceEvent off = rows.stream().filter(e -> e.getStaffId() == 5L).findFirst().orElseThrow();
        PerformanceEvent on = rows.stream().filter(e -> e.getStaffId() == 6L).findFirst().orElseThrow();
        assertEquals(-1, off.getQuantity());
        assertEquals(1, on.getQuantity());
        assertEquals(0, on.getRevision());
        assertEquals(SOLD, on.getOccurredAt());
    }

    @Test
    void countOnlyMetricsKeepANullAmount() {
        Credit session = new Credit(Metric.PT_SESSION_DELIVERED, 5L, 1L, SOLD, 1, null);
        List<PerformanceEvent> rows = PerformanceEventRecorder.plan("session", 3L, List.of(session), List.of(), NOW, OPEN);
        assertNull(rows.get(0).getAmount());
        List<PerformanceEvent> ledger = apply(List.of(), rows);
        List<PerformanceEvent> cancelled = PerformanceEventRecorder.plan("session", 3L, List.of(), ledger, NOW, OPEN);
        assertEquals(-1, cancelled.get(0).getQuantity());
        assertNull(cancelled.get(0).getAmount());
    }
}
