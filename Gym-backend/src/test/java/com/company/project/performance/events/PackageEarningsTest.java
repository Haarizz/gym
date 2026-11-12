package com.company.project.performance.events;

import com.company.project.entities.TrainingPackage;
import com.company.project.performance.metric.Metric;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** The examples in docs/training-packages-commission-plan.md §6 (commission rate applied by the plan, not here). */
class PackageEarningsTest {

    private static final Long RAHUL = 5L;
    private static final Long ASHA = 6L;
    private static final LocalDateTime SOLD = LocalDateTime.of(2026, 1, 20, 9, 0);
    private static final Function<LocalDateTime, LocalDateTime> UTC = t -> t;

    private static PackageEarnings.Enrolment sessions(String timing, String unused, String money, LocalDate cancelledOn,
                                                      List<PackageEarnings.TrainerChange> changes) {
        return new PackageEarnings.Enrolment(1L, TrainingPackage.TYPE_SESSIONS, timing, unused, 15, 60,
                LocalDate.of(2026, 1, 20), LocalDate.of(2026, 3, 20), changes.isEmpty() ? RAHUL : ASHA, changes,
                SOLD, new BigDecimal(money), cancelledOn);
    }

    private static PackageEarnings.Enrolment days(String money, LocalDate cancelledOn, List<PackageEarnings.TrainerChange> changes) {
        return new PackageEarnings.Enrolment(1L, TrainingPackage.TYPE_DAYS, TrainingPackage.TIMING_COMPLETION,
                TrainingPackage.UNUSED_FORFEIT, null, 30, LocalDate.of(2026, 1, 20), LocalDate.of(2026, 2, 18),
                changes.isEmpty() ? RAHUL : ASHA, changes, SOLD, new BigDecimal(money), cancelledOn);
    }

    private static List<PackageEarnings.UsedSession> used(int inJanuary, int inFebruary) {
        List<PackageEarnings.UsedSession> out = new ArrayList<>();
        long id = 1;
        for (int i = 0; i < inJanuary; i++) out.add(new PackageEarnings.UsedSession(id++, LocalDate.of(2026, 1, 21 + i), LocalTime.of(7, 0), RAHUL));
        for (int i = 0; i < inFebruary; i++) out.add(new PackageEarnings.UsedSession(id++, LocalDate.of(2026, 2, 1 + i), LocalTime.of(7, 0), RAHUL));
        return out;
    }

    private static Map<YearMonth, BigDecimal> revenueByMonth(List<Credit> credits, Long staff) {
        return credits.stream().filter(c -> c.metric() == Metric.PT_REVENUE && Objects.equals(c.staffId(), staff))
                .collect(Collectors.groupingBy(c -> YearMonth.from(c.occurredAt()), TreeMap::new,
                        Collectors.reducing(BigDecimal.ZERO, Credit::amount, BigDecimal::add)));
    }

    private static BigDecimal total(List<Credit> credits, Metric metric) {
        return credits.stream().filter(c -> c.metric() == metric).map(Credit::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Test
    void onEnrolmentEverythingCountsWhenPaid() {
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_ENROLMENT, TrainingPackage.UNUSED_FORFEIT,
                "15000", null, List.of()), used(9, 6), UTC);
        assertEquals(Map.of(YearMonth.of(2026, 1), new BigDecimal("15000.00")), revenueByMonth(c, RAHUL));
        Credit sale = c.stream().filter(x -> x.metric() == Metric.PT_SALE).findFirst().orElseThrow();
        assertEquals(1, sale.quantity());
        assertEquals(new BigDecimal("15000.00"), sale.amount());
        assertEquals(SOLD, sale.occurredAt());
    }

    @Test
    void sessionBasedCompletionSplitsByWhenSessionsHappen() {
        // ₹15,000 for 15 sessions: 9 in January, 6 in February → ₹9,000 and ₹6,000 (₹900 / ₹600 at 10%).
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_COMPLETION, TrainingPackage.UNUSED_FORFEIT,
                "15000", null, List.of()), used(9, 6), UTC);
        assertEquals(new BigDecimal("9000.00"), revenueByMonth(c, RAHUL).get(YearMonth.of(2026, 1)));
        assertEquals(new BigDecimal("6000.00"), revenueByMonth(c, RAHUL).get(YearMonth.of(2026, 2)));
        assertEquals(15, c.stream().filter(x -> x.metric() == Metric.PT_REVENUE).map(Credit::part).distinct().count());
    }

    @Test
    void sharesAlwaysAddUpToTheMoney() {
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_COMPLETION, TrainingPackage.UNUSED_FORFEIT,
                "1000", null, List.of()), used(9, 6), UTC);
        assertEquals(new BigDecimal("1000.00"), total(c, Metric.PT_REVENUE));
    }

    @Test
    void unusedSessionsAreForfeitedByDefault() {
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_COMPLETION, TrainingPackage.UNUSED_FORFEIT,
                "15000", null, List.of()), used(9, 0), UTC);
        assertEquals(new BigDecimal("9000.00"), total(c, Metric.PT_REVENUE));
    }

    @Test
    void unusedSessionsCanBePaidAtExpiry() {
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_COMPLETION, TrainingPackage.UNUSED_PAY_AT_EXPIRY,
                "15000", null, List.of()), used(9, 0), UTC);
        Credit expiry = c.stream().filter(x -> "expiry".equals(x.part())).findFirst().orElseThrow();
        assertEquals(new BigDecimal("6000.00"), expiry.amount());
        assertEquals(LocalDate.of(2026, 3, 20), expiry.occurredAt().toLocalDate());
        assertEquals(new BigDecimal("15000.00"), total(c, Metric.PT_REVENUE));
    }

    @Test
    void sessionsBeyondThePackageEarnNothing() {
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_COMPLETION, TrainingPackage.UNUSED_FORFEIT,
                "15000", null, List.of()), used(10, 10), UTC);
        assertEquals(new BigDecimal("15000.00"), total(c, Metric.PT_REVENUE));
    }

    @Test
    void sessionShareGoesToTheTrainerWhoRanIt() {
        List<PackageEarnings.UsedSession> u = new ArrayList<>(used(1, 0));
        u.add(new PackageEarnings.UsedSession(99L, LocalDate.of(2026, 1, 25), LocalTime.of(8, 0), ASHA));
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_COMPLETION, TrainingPackage.UNUSED_FORFEIT,
                "15000", null, List.of()), u, UTC);
        assertEquals(new BigDecimal("1000.00"), revenueByMonth(c, ASHA).get(YearMonth.of(2026, 1)));
    }

    @Test
    void dayBasedCompletionSplitsByDaysInEachMonth() {
        // ₹9,000 for 30 days from 20 Jan: 12 days in January, 18 in February → ₹3,600 and ₹5,400.
        List<Credit> c = PackageEarnings.credits(days("9000", null, List.of()), List.of(), UTC);
        Map<YearMonth, BigDecimal> m = revenueByMonth(c, RAHUL);
        assertEquals(new BigDecimal("3600.00"), m.get(YearMonth.of(2026, 1)));
        assertEquals(new BigDecimal("5400.00"), m.get(YearMonth.of(2026, 2)));
        // Each month's share is dated at the first day it covers.
        assertTrue(c.stream().anyMatch(x -> x.occurredAt().toLocalDate().equals(LocalDate.of(2026, 2, 1))));
    }

    @Test
    void dayBasedTrainerChangeSplitsTheMonth() {
        List<PackageEarnings.TrainerChange> change = List.of(new PackageEarnings.TrainerChange(LocalDate.of(2026, 2, 9), RAHUL, ASHA));
        List<Credit> c = PackageEarnings.credits(days("9000", null, change), List.of(), UTC);
        // Rahul: 12 Jan days + 8 Feb days; Asha: the last 10 days.
        assertEquals(new BigDecimal("3600.00"), revenueByMonth(c, RAHUL).get(YearMonth.of(2026, 1)));
        assertEquals(new BigDecimal("2400.00"), revenueByMonth(c, RAHUL).get(YearMonth.of(2026, 2)));
        assertEquals(new BigDecimal("3000.00"), revenueByMonth(c, ASHA).get(YearMonth.of(2026, 2)));
    }

    @Test
    void cancelledDayBasedKeepsDaysAlreadyPassed() {
        List<Credit> c = PackageEarnings.credits(days("9000", LocalDate.of(2026, 2, 5), List.of()), List.of(), UTC);
        // 12 January days + 5 February days = 17 of 30.
        assertEquals(new BigDecimal("5100.00"), total(c, Metric.PT_REVENUE));
        assertEquals(BigDecimal.ZERO, total(c, Metric.PT_SALE));
    }

    @Test
    void cancelledOnEnrolmentIsClawedBack() {
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_ENROLMENT, TrainingPackage.UNUSED_FORFEIT,
                "15000", LocalDate.of(2026, 2, 1), List.of()), used(3, 0), UTC);
        assertTrue(c.isEmpty());
    }

    @Test
    void cancelledSessionBasedKeepsUsedSessionsOnly() {
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_COMPLETION, TrainingPackage.UNUSED_PAY_AT_EXPIRY,
                "15000", LocalDate.of(2026, 1, 31), List.of()), used(9, 6), UTC);
        assertEquals(new BigDecimal("9000.00"), total(c, Metric.PT_REVENUE));
        assertTrue(c.stream().noneMatch(x -> "expiry".equals(x.part())));
    }

    @Test
    void nothingUntilPaid() {
        assertTrue(PackageEarnings.credits(sessions(TrainingPackage.TIMING_ENROLMENT, TrainingPackage.UNUSED_FORFEIT,
                "0", null, List.of()), used(3, 0), UTC).isEmpty());
    }

    @Test
    void saleIsCreditedToTheTrainerItWasSoldWith() {
        List<PackageEarnings.TrainerChange> change = List.of(new PackageEarnings.TrainerChange(LocalDate.of(2026, 2, 1), RAHUL, ASHA));
        List<Credit> c = PackageEarnings.credits(sessions(TrainingPackage.TIMING_ENROLMENT, TrainingPackage.UNUSED_FORFEIT,
                "15000", null, change), List.of(), UTC);
        assertTrue(c.stream().allMatch(x -> RAHUL.equals(x.staffId())));
    }

    @Test
    void moneyReceivedFollowsTheAddonSale() {
        assertEquals(BigDecimal.ZERO, EnrolmentDeriver.moneyReceived("Pending Approval", new BigDecimal("100"), null, "Paid", "PENDING", null, null, null));
        assertEquals(new BigDecimal("80"), EnrolmentDeriver.moneyReceived("Cancelled", new BigDecimal("100"), new BigDecimal("80"), "Cancelled", null, null, null, null));
        assertEquals(new BigDecimal("100"), EnrolmentDeriver.moneyReceived("Active", new BigDecimal("100"), null, null, null, null, null, null));
        assertEquals(new BigDecimal("40"), EnrolmentDeriver.moneyReceived("Active", new BigDecimal("100"), null, "Partial", null, new BigDecimal("40"), null, new BigDecimal("100")));
    }

    @Test
    void monthlyPartsAreSeparateLedgerRows() {
        List<Credit> c = PackageEarnings.credits(days("9000", null, List.of()), List.of(), UTC);
        List<PerformanceEvent> rows = PerformanceEventRecorder.plan("enrolment", 1L, c, List.of(),
                LocalDateTime.of(2026, 1, 20, 10, 0), (s, t, b) -> false);
        assertEquals(3, rows.size()); // sale + January + February
        assertEquals(Set.of("", "d:2026-01", "d:2026-02"), rows.stream().map(PerformanceEvent::getPart).collect(Collectors.toSet()));
    }
}
