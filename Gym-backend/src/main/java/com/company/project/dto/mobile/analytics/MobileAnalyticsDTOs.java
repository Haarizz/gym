package com.company.project.dto.mobile.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Response shapes for the mobile admin Analytics screen (Membership & Add-ons,
 * Bookings & Classes, POS Sales tabs). Serialised snake_case by the global
 * Jackson naming strategy.
 */
public final class MobileAnalyticsDTOs {

    private MobileAnalyticsDTOs() {}

    /** Period the tab covers; {@code to} is inclusive. Granularity is day, week or month. */
    public record Range(String period, LocalDate from, LocalDate to, String granularity) {}

    /** A headline number with the same metric over the previous, equally long period (null when not comparable). */
    public record Kpi(BigDecimal value, BigDecimal previous) {}

    /** One labelled amount — chart slices, ranked bars. */
    public record NamedValue(String name, BigDecimal value, long count) {}

    // ── Membership & Add-ons ──────────────────────────────────────────────

    public record MembershipTrendPoint(LocalDate bucket, long newJoins, long renewals, long lost) {}

    public record MembershipAnalytics(
            Range range,
            long activeMembers,
            Kpi newJoins,
            Kpi renewals,
            Kpi lost,
            Kpi membershipRevenue,
            /** renewals ÷ (renewals + lost), 0–100; null when nobody was up for renewal. */
            Double renewalRate,
            long expiringIn7Days,
            long expiringIn30Days,
            long frozenNow,
            BigDecimal freezeCharges,
            List<MembershipTrendPoint> trend,
            List<NamedValue> revenueByPlan,
            Kpi addonRevenue,
            long addonUnits,
            /** % of active members holding an active add-on, 0–100. */
            Double addonUptake,
            List<NamedValue> topAddons) {}

    // ── Bookings & Classes ────────────────────────────────────────────────

    public record BookingOutcomes(long attended, long noShow, long cancelled, long upcoming) {}

    public record ClassFill(String name, long sessions, long booked, long capacity, double fillRate) {}

    /** day: 1 = Monday … 7 = Sunday; hour: 0–23 (session start). */
    public record HeatCell(int day, int hour, long bookings) {}

    public record TrainerStat(String name, long sessions, long bookings, BigDecimal revenue) {}

    public record BookingsAnalytics(
            Range range,
            Kpi bookings,
            Kpi revenue,
            /** Group-class seats booked ÷ capacity, 0–100; null when no capacity was scheduled. */
            Kpi fillRate,
            Kpi cancellations,
            long pendingApprovals,
            BookingOutcomes outcomes,
            List<ClassFill> classFill,
            List<HeatCell> heatmap,
            BigDecimal ptRevenue,
            BigDecimal classRevenue,
            List<TrainerStat> topTrainers) {}

    // ── POS Sales ─────────────────────────────────────────────────────────

    public record SalesTrendPoint(LocalDate bucket, BigDecimal netSales, long transactions) {}

    public record PosAnalytics(
            Range range,
            Kpi netSales,
            Kpi transactions,
            Kpi averageBill,
            /** Gross margin %, 0–100; null when no product costs are recorded. */
            Kpi grossMargin,
            BigDecimal discounts,
            long returnsCount,
            BigDecimal returnsAmount,
            BigDecimal outstandingCredit,
            List<SalesTrendPoint> trend,
            List<NamedValue> topProducts,
            List<NamedValue> byCategory,
            List<NamedValue> paymentMix) {}
}
