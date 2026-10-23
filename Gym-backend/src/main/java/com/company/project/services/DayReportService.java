package com.company.project.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Everything that happened on one day or over a date range, for Reports → Day Report:
 * collections (by stream, method, day and hour), member receipts, POS sales, sales
 * invoices, purchases, expenses, payment vouchers, membership activity, attendance and leads.
 *
 * Not transactional itself: each section runs in its own transaction (DayReportSections),
 * so the branch filter applies and each section is computed independently: one that fails is reported under
 * "errors" instead of failing the whole report. camelCase Map keys throughout.
 */
@Service
public class DayReportService {

    private static final Logger log = LoggerFactory.getLogger(DayReportService.class);

    private final RevenueDashboardService revenueDashboardService;
    private final DayReportSections sections;

    public DayReportService(RevenueDashboardService revenueDashboardService, DayReportSections sections) {
        this.revenueDashboardService = revenueDashboardService;
        this.sections = sections;
    }

    /** @param from first day, inclusive; @param to last day, inclusive */
    public Map<String, Object> build(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        boolean singleDay = from.equals(to);
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, String> errors = new LinkedHashMap<>();
        out.put("date", from.toString());
        out.put("from", from.toString());
        out.put("to", to.toString());

        // One day → the trend is hourly; a range → daily (with expenses per day)
        out.put("revenue", section("revenue", errors, () -> revenueDashboardService.getSummary(from, to, singleDay ? "hourly" : "daily")));
        out.put("collectionByHour", section("revenue", errors, () -> collectionByHourOfDay(from, to)));
        out.put("receipts", section("receipts", errors, () -> sections.receipts(start, end)));
        out.put("posSales", section("posSales", errors, () -> sections.posSales(start, end)));
        out.put("salesInvoices", section("salesInvoices", errors, () -> sections.salesInvoices(from, to)));
        out.put("supplierBills", section("supplierBills", errors, () -> sections.supplierBills(from, to)));
        out.put("purchaseOrders", section("purchaseOrders", errors, () -> sections.purchaseOrders(start, end)));
        out.put("expenses", section("expenses", errors, () -> sections.expenses(from, to)));
        out.put("paymentVouchers", section("paymentVouchers", errors, () -> sections.paymentVouchers(from, to)));
        out.put("membership", section("membership", errors, () -> sections.membership(start, end)));
        out.put("attendance", section("attendance", errors, () -> sections.attendance(from, to)));
        out.put("leads", section("leads", errors, () -> sections.leads(start, end)));
        out.put("errors", errors);
        return out;
    }

    /** Collection folded onto the 24 hours of the day — the busiest hours across the whole range. */
    private List<Map<String, Object>> collectionByHourOfDay(LocalDate from, LocalDate to) {
        BigDecimal[] byHour = new BigDecimal[24];
        Arrays.fill(byHour, BigDecimal.ZERO);
        for (Map<String, Object> point : revenueDashboardService.collectionTrend(from, to, "hourly")) {
            int hour = LocalDateTime.parse((String) point.get("start")).getHour();
            byHour[hour] = byHour[hour].add((BigDecimal) point.get("revenue"));
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("hour", h);
            m.put("collection", byHour[h]);
            rows.add(m);
        }
        return rows;
    }

    private <T> T section(String name, Map<String, String> errors, Supplier<T> body) {
        try {
            return body.get();
        } catch (RuntimeException e) {
            log.warn("Day report section '{}' failed: {}", name, e.getMessage());
            errors.put(name, "Could not load this section");
            return null;
        }
    }
}
