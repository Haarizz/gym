package com.company.project.services.mobile.dashboard.admin;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class AdminDashboardDateRangeTest {

    @Test
    void singleDayRange_hasCorrectStartAndExclusiveEnd() {
        LocalDate day = LocalDate.of(2026, 3, 26);
        AdminDashboardDateRange range = AdminDashboardDateRange.of(day, day);

        assertEquals(LocalDateTime.of(2026, 3, 26, 0, 0), range.getStart());
        assertEquals(LocalDateTime.of(2026, 3, 27, 0, 0), range.getEnd());
    }

    @Test
    void previousPeriod_isSameLengthImmediatelyBeforeStart() {
        AdminDashboardDateRange range = AdminDashboardDateRange.of(
                LocalDate.of(2026, 3, 20), LocalDate.of(2026, 3, 26)); // 7-day span

        assertEquals(range.getStart(), range.getPreviousEnd());
        assertEquals(LocalDateTime.of(2026, 3, 13, 0, 0), range.getPreviousStart());
    }

    @Test
    void toBeforeFrom_throws() {
        assertThrows(IllegalArgumentException.class, () ->
                AdminDashboardDateRange.of(LocalDate.of(2026, 3, 26), LocalDate.of(2026, 3, 20)));
    }

    @Test
    void nullDates_throw() {
        assertThrows(IllegalArgumentException.class, () -> AdminDashboardDateRange.of(null, LocalDate.now()));
        assertThrows(IllegalArgumentException.class, () -> AdminDashboardDateRange.of(LocalDate.now(), null));
    }

    @Test
    void today_isASingleDayRange() {
        AdminDashboardDateRange range = AdminDashboardDateRange.today();
        assertEquals(range.getFromDate(), range.getToDate());
    }
}
