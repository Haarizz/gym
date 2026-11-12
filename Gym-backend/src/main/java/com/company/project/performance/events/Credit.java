package com.company.project.performance.events;

import com.company.project.performance.metric.Metric;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * What a source row should currently be credited with, for one metric and one person (staffId may
 * be null). {@code part} tells apart several credits of one row for the same metric and person —
 * e.g. a day-based training package earns a separate share in each month ("" when there's one).
 */
public record Credit(Metric metric, Long staffId, Long branchId, LocalDateTime occurredAt, int quantity,
                     BigDecimal amount, String part) {

    public Credit(Metric metric, Long staffId, Long branchId, LocalDateTime occurredAt, int quantity, BigDecimal amount) {
        this(metric, staffId, branchId, occurredAt, quantity, amount, "");
    }

    public Credit {
        if (part == null) part = "";
    }

    public Key key() {
        return new Key(metric.name(), staffId, part);
    }

    public record Key(String metric, Long staffId, String part) {}
}
