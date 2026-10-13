package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Real-data payloads for the BiOS analysis dialogs (BiosInsightsService). Each
 * dialog fetches its own group when opened, scoped like every other BiOS call
 * to the active branch, or to every branch in "All Branches" mode. Sections
 * GymBios has no data for (competitors, ad spend, market share, model accuracy)
 * are not represented here — the dialogs no longer show them.
 */
public final class BiosInsightsDTO {

    private BiosInsightsDTO() {}

    public record LabelCount(String label, long count) {}

    // ── Revenue dialog ────────────────────────────────────────────────────────

    /**
     * Money taken in the last `windowDays` days: membership/billing receipts plus
     * completed POS sales (POS sales don't create receipts, so nothing is counted twice).
     */
    public record RevenueInsights(int windowDays,
                                  List<PaymentMethodRow> paymentMethods,
                                  List<TimeSlotRow> byWeekday,
                                  List<TimeSlotRow> byHour,
                                  List<MembershipTypeRevenue> membershipTypes,
                                  List<SessionRevenue> trainers,
                                  List<SessionRevenue> classes,
                                  List<RetailCategory> retail,
                                  List<RevenueStream> streams,
                                  long leads,
                                  long convertedLeads) {}

    public record PaymentMethodRow(String method, long transactions, BigDecimal amount) {}

    /** slot is ISO weekday 1 (Mon)–7 (Sun), or hour of day 0–23. */
    public record TimeSlotRow(int slot, long transactions, BigDecimal amount) {}

    /** New/Renewal receipts in the window vs the window before it, per membership type. */
    public record MembershipTypeRevenue(String membershipType, long members, long activeMembers, long receipts,
                                        BigDecimal revenue, BigDecimal previousRevenue,
                                        BigDecimal avgMonthlyFee, double lapsedPercent, Double avgTenureMonths) {}

    /** Bookings on sessions dated in the window, grouped by trainer (PT) or class name. */
    public record SessionRevenue(String name, long sessions, long bookings, long capacity, BigDecimal revenue) {}

    public record RetailCategory(String category, long units, long transactions, BigDecimal revenue, BigDecimal cost) {}

    /** One revenue stream's last 30 days vs the 30 days before. */
    public record RevenueStream(String stream, BigDecimal current, BigDecimal previous) {}

    // ── Member dialog / BI engine members tab ─────────────────────────────────

    public record MemberInsights(LocalDate asOf,
                                 List<SegmentRow> segments,
                                 List<BandRow> ageBands,
                                 List<LabelCount> genders,
                                 List<LabelCount> nationalities,
                                 Double averageAge,
                                 long membersWithBirthDate,
                                 List<BandRow> activityLevels,
                                 Engagement engagement,
                                 List<TenureStage> tenureStages,
                                 Ltv ltv,
                                 List<ChannelRow> acquisition,
                                 List<EngagementTier> engagementTiers,
                                 List<AtRiskMember> atRisk,
                                 Satisfaction satisfaction) {}

    /** Per membership type; visit/booking figures are per effectively active member over the last 30 days. */
    public record SegmentRow(String membershipType, long members, long activeMembers,
                             double avgVisits30, double classBookingsPerActive30, double ptBookingsPerActive30,
                             Double avgAge, BigDecimal avgMonthlyFee, BigDecimal avgLtv, Double avgTenureMonths) {}

    /** avgLtv is null where it doesn't apply (activity levels). */
    public record BandRow(String label, long count, BigDecimal avgLtv) {}

    public record Engagement(long activeMembers, double avgVisitsPerActive30,
                             double classUptakePercent, double ptUptakePercent) {}

    public record TenureStage(String label, long members, long activeMembers) {}

    /** Lifetime value = everything a member has paid on receipts, averaged over members who paid anything. */
    public record Ltv(BigDecimal average, long payingMembers, Double avgTenureMonths) {}

    public record ChannelRow(String source, long leads, long converted, BigDecimal avgLtvConverted) {}

    public record EngagementTier(String tier, long members, double avgVisitsPerWeek, double classUptakePercent,
                                 double avgPosPurchases30, BigDecimal avgLtv) {}

    /** daysSinceVisit null = never checked in. */
    public record AtRiskMember(Long memberDbId, String name, String memberCode, LocalDate lastVisit,
                               Long daysSinceVisit, LocalDate membershipEnds) {}

    /**
     * Post-workout feedback from the member app (1–5 stars; return likelihood 1–10)
     * over the last 90 days, with the 90 days before for comparison, plus app reviews.
     */
    public record Satisfaction(long responses, Double overall, Double trainer, Double equipment, Double facility,
                               Double previousOverall, ReturnScore returnScore, ReviewSummary reviews,
                               List<FeedbackComment> recentComments) {}

    /** NPS method on return likelihood: promoters 9–10, passives 7–8, detractors 1–6. */
    public record ReturnScore(long responses, long promoters, long passives, long detractors,
                              Double score, Double previousScore) {}

    public record ReviewSummary(long count, Double average, List<LabelCount> distribution) {}

    public record FeedbackComment(LocalDate date, Integer rating, String comment) {}

    // ── Operations (performance, reports, BI engine) ──────────────────────────

    public record OperationsInsights(List<DailyPoint> daily,
                                     List<DepartmentRow> departments,
                                     Inventory inventory,
                                     Assets assets,
                                     FinancialPosition finance,
                                     List<ExpenseChange> expenseChanges,
                                     List<ActivityMonth> reportActivity) {}

    public record DailyPoint(LocalDate date, long checkIns, BigDecimal revenue, long bookings, long capacity) {}

    /** This month's individual staff targets, grouped by the staff member's department. */
    public record DepartmentRow(String department, long staff, BigDecimal revenueTarget, BigDecimal revenueAchieved,
                                long sessionsTarget, long sessionsAchieved) {}

    public record Inventory(long products, long stockUnits, BigDecimal stockValue, long lowStock,
                            List<StockItem> lowStockItems, List<StockItem> deadStock, List<CostChange> costChanges) {}

    /** daysSinceLastSale null = never sold through POS. */
    public record StockItem(String product, long quantity, long reorderLevel, BigDecimal value, Long daysSinceLastSale) {}

    /** Latest vs previous purchase-order unit price, plus the cheapest supplier price seen for the product. */
    public record CostChange(String product, String supplier, BigDecimal previousCost, BigDecimal latestCost,
                             LocalDate latestDate, String cheapestSupplier, BigDecimal cheapestCost) {}

    public record Assets(long count, BigDecimal purchaseValue, BigDecimal currentValue, BigDecimal annualDepreciation,
                         long inMaintenance, List<AssetRow> needingService) {}

    public record AssetRow(String code, String name, String status, String condition, Integer utilizationRate,
                           LocalDate lastService, LocalDate nextService, BigDecimal maintenanceCost12m) {}

    /** Balances from posted journals and open documents. */
    public record FinancialPosition(BigDecimal supplierPayables, BigDecimal memberReceivables, long membersWithBalance,
                                    List<AccountBalance> liabilities, BigDecimal cashAndBank,
                                    BigDecimal avgMonthlyExpenses) {}

    public record AccountBalance(String code, String name, BigDecimal balance) {}

    /** Approved expenses: last 30 days vs the 30 days before. */
    public record ExpenseChange(String category, BigDecimal current, BigDecimal previous) {}

    public record ActivityMonth(String period, long reports, long exports) {}

    // ── Marketing (extra strategic intelligence) ──────────────────────────────

    public record MarketingInsights(int windowDays, List<ChannelRow> leadSources, List<PromotionRow> promotions,
                                    Referrals referrals) {}

    public record PromotionRow(String name, String status, String type, LocalDate startDate, LocalDate endDate,
                               long redemptions, BigDecimal revenue, BigDecimal savings) {}

    public record Referrals(long total, long successful, long pending, long expired,
                            BigDecimal rewards, BigDecimal purchaseValue) {}
}
