package com.company.project.services.mobile.dashboard.admin;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A validated, half-open [start, end) date-range window shared by every admin
 * dashboard KPI/alert/payment-mix/operational/report calculation, plus the
 * immediately-preceding window of the same length used for growth-percentage
 * comparisons.
 *
 * Boundaries are computed on the server's clock (UTC — see GymApplication's
 * TimeZone.setDefault), matching every other date-windowed calculation already
 * in this codebase (DashboardService, MobileStaffDashboardService, etc.), since
 * no branch/org timezone field exists in the schema.
 */
public final class AdminDashboardDateRange {

    private final LocalDate fromDate;
    private final LocalDate toDate;
    private final LocalDateTime start;
    private final LocalDateTime end;
    private final LocalDateTime previousStart;
    private final LocalDateTime previousEnd;

    private AdminDashboardDateRange(LocalDate fromDate, LocalDate toDate, LocalDateTime start, LocalDateTime end,
                                     LocalDateTime previousStart, LocalDateTime previousEnd) {
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.start = start;
        this.end = end;
        this.previousStart = previousStart;
        this.previousEnd = previousEnd;
    }

    /** @throws IllegalArgumentException if the range is malformed (maps to HTTP 400). */
    public static AdminDashboardDateRange of(LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null || toDate == null) {
            throw new IllegalArgumentException("Both 'from' and 'to' dates are required");
        }
        if (toDate.isBefore(fromDate)) {
            throw new IllegalArgumentException("'to' date cannot be before 'from' date");
        }
        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime end = toDate.plusDays(1).atStartOfDay();
        long spanDays = java.time.temporal.ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        LocalDateTime previousEnd = start;
        LocalDateTime previousStart = start.minusDays(spanDays);
        return new AdminDashboardDateRange(fromDate, toDate, start, end, previousStart, previousEnd);
    }

    public static AdminDashboardDateRange today() {
        LocalDate today = LocalDate.now();
        return of(today, today);
    }

    public LocalDate getFromDate() { return fromDate; }
    public LocalDate getToDate() { return toDate; }
    public LocalDateTime getStart() { return start; }
    public LocalDateTime getEnd() { return end; }
    public LocalDateTime getPreviousStart() { return previousStart; }
    public LocalDateTime getPreviousEnd() { return previousEnd; }
}
