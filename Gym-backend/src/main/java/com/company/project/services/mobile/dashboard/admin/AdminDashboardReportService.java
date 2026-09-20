package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardBranchContextDTO;
import com.company.project.dto.mobile.dashboard.admin.AdminDashboardReportResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardBookingRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardReceiptRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardSaleTransactionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Detail-report rows behind each clickable KPI card. Every report reuses the
 * exact same grouped queries (or, for the aggregate total, the exact same KPI
 * calculation method from {@link AdminDashboardKpiService}) that the summary
 * card used — so a report's total always reconciles with its card.
 *
 * All reports are pre-aggregated (grouped by branch/plan/category/trainer/date/
 * month, never raw per-transaction rows), so result sets stay small without
 * needing true DB-level pagination; pagination here just slices that already-
 * small aggregated list.
 */
@Service
public class AdminDashboardReportService {

    public static final List<String> SUPPORTED_REPORT_TYPES = List.of(
            "total-collections", "membership-sales", "pos-revenue", "pt-sales",
            "day-pass", "active-members", "churn-rate", "retention-rate");

    private final AdminDashboardReceiptRepository receiptRepository;
    private final AdminDashboardSaleTransactionRepository saleTransactionRepository;
    private final AdminDashboardBookingRepository bookingRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final AdminDashboardKpiService kpiService;

    public AdminDashboardReportService(AdminDashboardReceiptRepository receiptRepository,
                                        AdminDashboardSaleTransactionRepository saleTransactionRepository,
                                        AdminDashboardBookingRepository bookingRepository,
                                        MemberRepository memberRepository,
                                        BranchRepository branchRepository,
                                        AdminDashboardKpiService kpiService) {
        this.receiptRepository = receiptRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.bookingRepository = bookingRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.kpiService = kpiService;
    }

    public AdminDashboardReportResponseDTO getReport(String reportType, AdminDashboardFilterContext ctx,
                                                       int page, int pageSize) {
        if (!SUPPORTED_REPORT_TYPES.contains(reportType)) {
            throw new IllegalArgumentException("Unknown report type: " + reportType);
        }

        Report report = switch (reportType) {
            case "total-collections" -> totalCollectionsReport(ctx.getDateRange());
            case "membership-sales" -> membershipSalesReport(ctx.getDateRange());
            case "pos-revenue" -> posRevenueReport(ctx.getDateRange());
            case "pt-sales" -> ptSalesReport(ctx.getDateRange());
            case "day-pass" -> dayPassReport(ctx.getDateRange());
            case "active-members" -> activeMembersReport();
            case "churn-rate" -> churnReport(ctx.getDateRange());
            case "retention-rate" -> retentionReport(ctx.getDateRange());
            default -> throw new IllegalArgumentException("Unknown report type: " + reportType);
        };

        int safePage = Math.max(page, 0);
        int safeSize = pageSize <= 0 ? 20 : Math.min(pageSize, 200);
        int fromIndex = Math.min(safePage * safeSize, report.rows.size());
        int toIndex = Math.min(fromIndex + safeSize, report.rows.size());
        List<Map<String, Object>> pageRows = report.rows.subList(fromIndex, toIndex);
        int totalPages = (int) Math.ceil(report.rows.size() / (double) safeSize);

        AdminDashboardReportResponseDTO dto = new AdminDashboardReportResponseDTO();
        dto.setReportType(reportType);
        dto.setBranch(new AdminDashboardBranchContextDTO(ctx.getBranchId(), ctx.getBranchName(), ctx.isAllBranches()));
        dto.setFrom(ctx.getDateRange().getFromDate());
        dto.setTo(ctx.getDateRange().getToDate());
        dto.setCurrency("INR");
        dto.setColumns(report.columns);
        dto.setRows(pageRows);
        dto.setTotalEntries(report.rows.size());
        dto.setAggregateTotal(report.aggregateTotal);
        dto.setPage(safePage);
        dto.setPageSize(safeSize);
        dto.setTotalPages(Math.max(totalPages, 1));
        return dto;
    }

    // ── Individual report builders ──────────────────────────────────────────

    private Report totalCollectionsReport(AdminDashboardDateRange range) {
        List<Object[]> current = receiptRepository.sumAndCountGroupedByBranch(
                AdminDashboardKpiService.ALL_COLLECTION_TRANSACTION_TYPES, range.getStart(), range.getEnd());
        List<Object[]> previous = receiptRepository.sumAndCountGroupedByBranch(
                AdminDashboardKpiService.ALL_COLLECTION_TRANSACTION_TYPES, range.getPreviousStart(), range.getPreviousEnd());
        Map<Long, BigDecimal> previousByBranch = previous.stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (BigDecimal) r[2], (a, b) -> a));
        Map<Long, String> branchNames = branchRepository.findAllById(
                current.stream().map(r -> (Long) r[0]).filter(java.util.Objects::nonNull).collect(Collectors.toList())
        ).stream().collect(Collectors.toMap(Branch::getId, Branch::getBranchName));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : current) {
            Long branchId = (Long) r[0];
            long count = (Long) r[1];
            BigDecimal sum = (BigDecimal) r[2];
            Double growth = AdminDashboardKpiService.percentageChange(sum, previousByBranch.get(branchId));
            rows.add(row("Branch", branchId != null ? branchNames.getOrDefault(branchId, "Unknown Branch") : "Unassigned",
                    "Amount", sum, "Txns", count, "Growth", growth));
        }
        rows.sort((a, b) -> ((BigDecimal) b.get("Amount")).compareTo((BigDecimal) a.get("Amount")));

        BigDecimal total = kpiService.totalCollectionsKpi(range).getValue();
        return new Report(List.of("Branch", "Amount", "Txns", "Growth"), rows, total);
    }

    private Report membershipSalesReport(AdminDashboardDateRange range) {
        List<String> types = List.of("New", "Renewal");
        List<Object[]> current = receiptRepository.sumAndCountGroupedByPlan(types, range.getStart(), range.getEnd());
        List<Object[]> previous = receiptRepository.sumAndCountGroupedByPlan(types, range.getPreviousStart(), range.getPreviousEnd());
        Map<String, BigDecimal> previousByPlan = previous.stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (BigDecimal) r[2], (a, b) -> a));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : current) {
            String plan = (String) r[0];
            long count = (Long) r[1];
            BigDecimal sum = (BigDecimal) r[2];
            Double growth = AdminDashboardKpiService.percentageChange(sum, previousByPlan.get(plan));
            rows.add(row("Plan", plan, "Sales", sum, "Count", count, "Growth", growth));
        }
        rows.sort((a, b) -> ((BigDecimal) b.get("Sales")).compareTo((BigDecimal) a.get("Sales")));

        BigDecimal total = kpiService.membershipSalesKpi(range).getValue();
        return new Report(List.of("Plan", "Sales", "Count", "Growth"), rows, total);
    }

    private Report posRevenueReport(AdminDashboardDateRange range) {
        List<Object[]> current = saleTransactionRepository.sumAndUnitsGroupedByCategory(range.getStart(), range.getEnd());
        List<Object[]> previous = saleTransactionRepository.sumAndUnitsGroupedByCategory(range.getPreviousStart(), range.getPreviousEnd());
        Map<String, BigDecimal> previousByCategory = previous.stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (BigDecimal) r[2], (a, b) -> a));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : current) {
            String category = (String) r[0];
            long units = (Long) r[1];
            BigDecimal sum = (BigDecimal) r[2];
            Double growth = AdminDashboardKpiService.percentageChange(sum, previousByCategory.get(category));
            rows.add(row("Category", category, "Sales", sum, "Units", units, "Growth", growth));
        }
        rows.sort((a, b) -> ((BigDecimal) b.get("Sales")).compareTo((BigDecimal) a.get("Sales")));

        BigDecimal total = kpiService.posRevenueKpi(range).getValue();
        return new Report(List.of("Category", "Sales", "Units", "Growth"), rows, total);
    }

    private Report ptSalesReport(AdminDashboardDateRange range) {
        LocalDate from = range.getFromDate();
        LocalDate toExclusive = range.getToDate().plusDays(1);
        LocalDate prevFrom = range.getPreviousStart().toLocalDate();
        LocalDate prevToExclusive = range.getPreviousEnd().toLocalDate();
        List<Object[]> current = bookingRepository.sumAndCountGroupedByTrainer(from, toExclusive);
        List<Object[]> previous = bookingRepository.sumAndCountGroupedByTrainer(prevFrom, prevToExclusive);
        Map<String, BigDecimal> previousByTrainer = previous.stream()
                .collect(Collectors.toMap(r -> (String) r[0], r -> (BigDecimal) r[2], (a, b) -> a));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : current) {
            String trainer = (String) r[0];
            long sessions = (Long) r[1];
            BigDecimal sum = (BigDecimal) r[2];
            Double growth = AdminDashboardKpiService.percentageChange(sum, previousByTrainer.get(trainer));
            rows.add(row("Trainer", trainer, "Sales", sum, "Sessions", sessions, "Growth", growth));
        }
        rows.sort((a, b) -> ((BigDecimal) b.get("Sales")).compareTo((BigDecimal) a.get("Sales")));

        BigDecimal total = kpiService.ptSalesKpi(range).getValue();
        return new Report(List.of("Trainer", "Sales", "Sessions", "Growth"), rows, total);
    }

    private Report dayPassReport(AdminDashboardDateRange range) {
        List<Object[]> current = receiptRepository.sumAndCountGroupedByDate(
                AdminDashboardKpiService.DAY_PASS_TRANSACTION_TYPE, range.getStart(), range.getEnd());

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : current) {
            LocalDate date = toLocalDate(r[0]);
            long passes = (Long) r[1];
            BigDecimal sum = (BigDecimal) r[2];
            BigDecimal avgTicket = passes == 0 ? BigDecimal.ZERO
                    : sum.divide(BigDecimal.valueOf(passes), 2, RoundingMode.HALF_UP);
            // "Avg Ticket" replaces the illustrative "Peak" column from the frontend
            // mock — no peak-hour data exists without a separate low-value join, and
            // an average sale price is directly derivable from the same rows used
            // for the total, keeping this report single-sourced.
            rows.add(row("Date", date.toString(), "Passes", passes, "Revenue", sum, "Avg Ticket", avgTicket));
        }
        rows.sort((a, b) -> ((String) a.get("Date")).compareTo((String) b.get("Date")));

        BigDecimal total = kpiService.dayPassKpi(range).getValue();
        return new Report(List.of("Date", "Passes", "Revenue", "Avg Ticket"), rows, total);
    }

    private Report activeMembersReport() {
        List<Object[]> current = memberRepository.countActiveMembersByType();
        long totalActive = current.stream().mapToLong(r -> (Long) r[1]).sum();

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] r : current) {
            String type = r[0] != null ? (String) r[0] : "Unspecified";
            long count = (Long) r[1];
            double share = totalActive == 0 ? 0.0
                    : BigDecimal.valueOf(count).multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(totalActive), 2, RoundingMode.HALF_UP).doubleValue();
            // No membership-type-level history exists, so a period-over-period
            // change can't be computed per row — left explicitly unavailable
            // rather than fabricated.
            rows.add(row("Plan", type, "Count", count, "Share", share, "Change", "N/A"));
        }
        rows.sort((a, b) -> ((Long) b.get("Count")).compareTo((Long) a.get("Count")));

        return new Report(List.of("Plan", "Count", "Share", "Change"), rows, BigDecimal.valueOf(totalActive));
    }

    private Report churnReport(AdminDashboardDateRange range) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (MonthWindow w : monthWindows(range)) {
            AdminDashboardKpiService.ChurnFigures figures = kpiService.churnFigures(w.start, w.end);
            rows.add(row("Month", w.label, "Rate", figures.churnRatePercent, "Members", figures.churnedCount));
        }
        BigDecimal total = kpiService.churnFigures(range.getStart(), range.getEnd()).churnRatePercent;
        return new Report(List.of("Month", "Rate", "Members"), rows, total);
    }

    private Report retentionReport(AdminDashboardDateRange range) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (MonthWindow w : monthWindows(range)) {
            AdminDashboardKpiService.ChurnFigures figures = kpiService.churnFigures(w.start, w.end);
            rows.add(row("Month", w.label, "Rate", figures.retentionRatePercent, "Active Members", figures.baselineCount - figures.churnedCount));
        }
        BigDecimal total = kpiService.churnFigures(range.getStart(), range.getEnd()).retentionRatePercent;
        return new Report(List.of("Month", "Rate", "Active Members"), rows, total);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private List<MonthWindow> monthWindows(AdminDashboardDateRange range) {
        List<MonthWindow> windows = new ArrayList<>();
        YearMonth cursor = YearMonth.from(range.getFromDate());
        YearMonth last = YearMonth.from(range.getToDate());
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");
        while (!cursor.isAfter(last)) {
            LocalDateTime monthStart = cursor.atDay(1).atStartOfDay();
            LocalDateTime monthEnd = cursor.plusMonths(1).atDay(1).atStartOfDay();
            LocalDateTime clippedStart = monthStart.isBefore(range.getStart()) ? range.getStart() : monthStart;
            LocalDateTime clippedEnd = monthEnd.isAfter(range.getEnd()) ? range.getEnd() : monthEnd;
            windows.add(new MonthWindow(cursor.format(formatter), clippedStart, clippedEnd));
            cursor = cursor.plusMonths(1);
        }
        return windows;
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate ld) return ld;
        if (value instanceof java.sql.Date sd) return sd.toLocalDate();
        if (value instanceof LocalDateTime ldt) return ldt.toLocalDate();
        throw new IllegalStateException("Unexpected date type: " + (value == null ? "null" : value.getClass()));
    }

    private static Map<String, Object> row(Object... kv) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            map.put((String) kv[i], kv[i + 1]);
        }
        return map;
    }

    private static final class Report {
        final List<String> columns;
        final List<Map<String, Object>> rows;
        final BigDecimal aggregateTotal;

        Report(List<String> columns, List<Map<String, Object>> rows, BigDecimal aggregateTotal) {
            this.columns = columns;
            this.rows = rows;
            this.aggregateTotal = aggregateTotal;
        }
    }

    private static final class MonthWindow {
        final String label;
        final LocalDateTime start;
        final LocalDateTime end;

        MonthWindow(String label, LocalDateTime start, LocalDateTime end) {
            this.label = label;
            this.start = start;
            this.end = end;
        }
    }
}
