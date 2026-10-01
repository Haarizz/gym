package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.Expense;
import com.company.project.entities.FollowUp;
import com.company.project.entities.Lead;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipFreeze;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.PurchaseOrder;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SalesInvoice;
import com.company.project.entities.SupplierBill;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Everything that happened on one day, for Reports → Day Report: collections (by
 * stream, method and hour), member receipts, POS sales, sales invoices, purchases,
 * expenses, payment vouchers, membership activity, attendance and leads.
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

    public Map<String, Object> build(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, String> errors = new LinkedHashMap<>();
        out.put("date", date.toString());

        out.put("revenue", section("revenue", errors, () -> revenueDashboardService.getSummary(date, date, "hourly")));
        out.put("receipts", section("receipts", errors, () -> sections.receipts(start, end)));
        out.put("posSales", section("posSales", errors, () -> sections.posSales(start, end)));
        out.put("salesInvoices", section("salesInvoices", errors, () -> sections.salesInvoices(date)));
        out.put("supplierBills", section("supplierBills", errors, () -> sections.supplierBills(date)));
        out.put("purchaseOrders", section("purchaseOrders", errors, () -> sections.purchaseOrders(start, end)));
        out.put("expenses", section("expenses", errors, () -> sections.expenses(date)));
        out.put("paymentVouchers", section("paymentVouchers", errors, () -> sections.paymentVouchers(date)));
        out.put("membership", section("membership", errors, () -> sections.membership(date, start, end)));
        out.put("attendance", section("attendance", errors, () -> sections.attendance(start, end)));
        out.put("leads", section("leads", errors, () -> sections.leads(start, end)));
        out.put("errors", errors);
        return out;
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
