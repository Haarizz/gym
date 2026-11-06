package com.company.project.performance.targets;

import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;

import java.math.BigDecimal;

/** A resolved goal for one metric and measure, and where it came from (staff | role | branch target). */
public record Goal(Metric metric, Measure measure, BigDecimal goal, String source, Long targetId) {

    public Key key() {
        return new Key(metric, measure);
    }

    public record Key(Metric metric, Measure measure) {}
}
