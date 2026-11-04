package com.company.project.services.mobile.analytics;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MobileAnalyticsServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 4);

    @Test
    void monthToDateComparesWithSameDaysOfLastMonth() {
        var p = MobileAnalyticsService.resolvePeriod("month", TODAY);
        assertEquals(LocalDate.of(2026, 11, 1), p.start());
        assertEquals(LocalDate.of(2026, 11, 5), p.end());
        assertEquals(LocalDate.of(2026, 10, 1), p.prevStart());
        assertEquals(LocalDate.of(2026, 10, 5), p.prevEnd());
        assertEquals(MobileAnalyticsService.Granularity.DAY, p.granularity());
    }

    @Test
    void unknownPeriodFallsBackToMonth() {
        assertEquals("month", MobileAnalyticsService.resolvePeriod(null, TODAY).key());
        assertEquals("month", MobileAnalyticsService.resolvePeriod("bogus", TODAY).key());
    }

    @Test
    void lastMonthIsTheWholeCalendarMonth() {
        var p = MobileAnalyticsService.resolvePeriod("last_month", TODAY);
        assertEquals(LocalDate.of(2026, 10, 1), p.start());
        assertEquals(LocalDate.of(2026, 11, 1), p.end());
        assertEquals(LocalDate.of(2026, 9, 1), p.prevStart());
        assertEquals(LocalDate.of(2026, 10, 1), p.prevEnd());
    }

    @Test
    void threeMonthsUsesWeeksAndAnEquallyLongPreviousWindow() {
        var p = MobileAnalyticsService.resolvePeriod("3m", TODAY);
        assertEquals(LocalDate.of(2026, 8, 5), p.start());
        assertEquals(LocalDate.of(2026, 11, 5), p.end());
        long days = p.end().toEpochDay() - p.start().toEpochDay();
        assertEquals(days, p.prevEnd().toEpochDay() - p.prevStart().toEpochDay());
        assertEquals(p.start(), p.prevEnd());
        // Weekly buckets start on Mondays
        List<LocalDate> buckets = MobileAnalyticsService.buckets(p);
        assertEquals(LocalDate.of(2026, 8, 3), buckets.get(0));
        assertEquals(LocalDate.of(2026, 11, 2), buckets.get(buckets.size() - 1));
    }

    @Test
    void twelveMonthsHasOneBucketPerMonth() {
        var p = MobileAnalyticsService.resolvePeriod("12m", TODAY);
        List<LocalDate> buckets = MobileAnalyticsService.buckets(p);
        assertEquals(12, buckets.size());
        assertEquals(LocalDate.of(2025, 12, 1), buckets.get(0));
        assertEquals(LocalDate.of(2026, 11, 1), buckets.get(11));
        assertEquals(LocalDate.of(2024, 12, 1), p.prevStart());
        assertEquals(LocalDate.of(2025, 11, 5), p.prevEnd());
    }

    @Test
    void paymentMethodsNormalise() {
        assertEquals("CASH", MobileAnalyticsService.normaliseMethod("Cash"));
        assertEquals("CARD", MobileAnalyticsService.normaliseMethod("CARD"));
        assertEquals("CARD", MobileAnalyticsService.normaliseMethod("Credit Card"));
        assertEquals("CREDIT", MobileAnalyticsService.normaliseMethod("Credit"));
        assertEquals("ONLINE", MobileAnalyticsService.normaliseMethod("UPI"));
        assertEquals("WALLET", MobileAnalyticsService.normaliseMethod("wallet"));
        assertEquals("OTHER", MobileAnalyticsService.normaliseMethod("Cheque"));
        assertEquals("OTHER", MobileAnalyticsService.normaliseMethod(null));
    }
}
