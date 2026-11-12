package com.company.project.performance.metric;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Everything that can count toward a target or earn an incentive (plan §3). Each metric
 * measures a count, an amount (money), or both. {@link #REVENUE_TOTAL} is virtual: the sum of
 * the amount of every revenue metric; no event is ever recorded under it.
 *
 * First release: core metrics only. Adding one means a new constant here, a deriver that
 * records it (see events/), and its labels in the web and mobile apps.
 */
public enum Metric {

    MEMBER_ADMISSION("New member admissions", Audience.BOTH, true, true, true),
    LEAD_CONVERSION("Lead conversions", Audience.STAFF, true, false, false),
    POS_SALE("POS sales", Audience.STAFF, true, true, true),
    PT_SESSION_DELIVERED("PT sessions delivered", Audience.TRAINER, true, false, false),
    CLASS_TAUGHT("Classes taught", Audience.TRAINER, true, false, false),
    CLASS_ATTENDEE("Class attendees", Audience.TRAINER, true, false, false),
    /**
     * PT sold: training packages and normal paid PT session bookings. Count, and money received,
     * on the payment date, to the trainer (part of total revenue). This is what PT targets track.
     */
    PT_SALE("PT sales", Audience.TRAINER, true, true, true),
    /**
     * The PT money commission is paid on: for a package, all of it when paid ("on booking"), or
     * share by share as sessions/days are used ("on completion"); for a normal paid PT booking,
     * all of it when paid. Not part of total revenue — the money is already counted as PT_SALE.
     */
    PT_REVENUE("PT earned for commission", Audience.TRAINER, false, true, false),
    REVENUE_TOTAL("Total revenue", Audience.BOTH, false, true, false);

    public enum Audience { STAFF, TRAINER, BOTH }

    private final String label;
    private final Audience audience;
    private final boolean hasCount;
    private final boolean hasAmount;
    private final boolean revenue;

    Metric(String label, Audience audience, boolean hasCount, boolean hasAmount, boolean revenue) {
        this.label = label;
        this.audience = audience;
        this.hasCount = hasCount;
        this.hasAmount = hasAmount;
        this.revenue = revenue;
    }

    public String label() { return label; }
    public Audience audience() { return audience; }
    public boolean hasCount() { return hasCount; }
    public boolean hasAmount() { return hasAmount; }
    /** Its amount is part of {@link #REVENUE_TOTAL}. */
    public boolean isRevenue() { return revenue; }
    public boolean isVirtual() { return this == REVENUE_TOTAL; }

    public boolean supports(Measure measure) {
        return measure == Measure.COUNT ? hasCount : hasAmount;
    }

    /** Metrics events are recorded under (everything but the virtual ones). */
    public static List<Metric> recorded() {
        return Arrays.stream(values()).filter(m -> !m.isVirtual()).toList();
    }

    public static List<Metric> revenueMetrics() {
        return Arrays.stream(values()).filter(Metric::isRevenue).toList();
    }

    public static Optional<Metric> parse(String code) {
        if (code == null) return Optional.empty();
        try {
            return Optional.of(Metric.valueOf(code.trim().toUpperCase()));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public static Metric require(String code) {
        return parse(code).orElseThrow(() ->
                new com.company.project.exceptions.BusinessRuleViolationException("Unknown metric " + code));
    }
}
