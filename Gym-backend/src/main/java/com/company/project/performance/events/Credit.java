package com.company.project.performance.events;

import com.company.project.performance.metric.Metric;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** What a source row should currently be credited with, for one metric and one person (staffId may be null). */
public record Credit(Metric metric, Long staffId, Long branchId, LocalDateTime occurredAt, int quantity, BigDecimal amount) {

    public Key key() {
        return new Key(metric.name(), staffId);
    }

    public record Key(String metric, Long staffId) {}
}
