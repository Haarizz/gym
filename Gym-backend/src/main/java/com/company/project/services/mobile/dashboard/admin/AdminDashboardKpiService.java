package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardKpiDTO;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardBookingRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardReceiptRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardSaleTransactionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Computes the 9 Admin Dashboard KPI summary cards. Each KPI's calculation here
 * is the same one {@link AdminDashboardReportService} uses for that KPI's detail
 * report total, so the summary card and the report it opens always reconcile.
 */
@Service
public class AdminDashboardKpiService {

    private static final List<String> MEMBERSHIP_TRANSACTION_TYPES = List.of("New", "Renewal");
    static final String DAY_PASS_TRANSACTION_TYPE = "Daily Entry";
    static final List<String> ALL_COLLECTION_TRANSACTION_TYPES = List.of("New", "Renewal", "Add-on", "Daily Entry");

    private final AdminDashboardReceiptRepository receiptRepository;
    private final AdminDashboardSaleTransactionRepository saleTransactionRepository;
    private final AdminDashboardBookingRepository bookingRepository;
    private final MemberRepository memberRepository;
    private final AttendanceRepository attendanceRepository;

    public AdminDashboardKpiService(AdminDashboardReceiptRepository receiptRepository,
                                     AdminDashboardSaleTransactionRepository saleTransactionRepository,
                                     AdminDashboardBookingRepository bookingRepository,
                                     MemberRepository memberRepository,
                                     AttendanceRepository attendanceRepository) {
        this.receiptRepository = receiptRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.bookingRepository = bookingRepository;
        this.memberRepository = memberRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public List<AdminDashboardKpiDTO> getKpis(AdminDashboardFilterContext ctx) {
        AdminDashboardDateRange range = ctx.getDateRange();
        List<AdminDashboardKpiDTO> kpis = new ArrayList<>();

        kpis.add(totalCollectionsKpi(range));
        kpis.add(membershipSalesKpi(range));
        kpis.add(posRevenueKpi(range));
        kpis.add(ptSalesKpi(range));
        kpis.add(dayPassKpi(range));
        kpis.add(checkInsKpi(range));
        kpis.add(activeMembersKpi());
        kpis.addAll(churnAndRetentionKpis(range));

        return kpis;
    }

    AdminDashboardKpiDTO totalCollectionsKpi(AdminDashboardDateRange range) {
        BigDecimal current = receiptRepository.sumPaidByTransactionTypesInPeriod(
                ALL_COLLECTION_TRANSACTION_TYPES, range.getStart(), range.getEnd());
        BigDecimal previous = receiptRepository.sumPaidByTransactionTypesInPeriod(
                ALL_COLLECTION_TRANSACTION_TYPES, range.getPreviousStart(), range.getPreviousEnd());
        return AdminDashboardKpiDTO.of("total-collections", "Total Collections", "currency",
                current, percentageChange(current, previous), true);
    }

    AdminDashboardKpiDTO membershipSalesKpi(AdminDashboardDateRange range) {
        BigDecimal current = receiptRepository.sumPaidByTransactionTypesInPeriod(
                MEMBERSHIP_TRANSACTION_TYPES, range.getStart(), range.getEnd());
        BigDecimal previous = receiptRepository.sumPaidByTransactionTypesInPeriod(
                MEMBERSHIP_TRANSACTION_TYPES, range.getPreviousStart(), range.getPreviousEnd());
        return AdminDashboardKpiDTO.of("membership-sales", "Membership Sales", "currency",
                current, percentageChange(current, previous), true);
    }

    AdminDashboardKpiDTO posRevenueKpi(AdminDashboardDateRange range) {
        BigDecimal current = saleTransactionRepository.sumCompletedInPeriod(range.getStart(), range.getEnd());
        BigDecimal previous = saleTransactionRepository.sumCompletedInPeriod(range.getPreviousStart(), range.getPreviousEnd());
        return AdminDashboardKpiDTO.of("pos-revenue", "POS Revenue", "currency",
                current, percentageChange(current, previous), true);
    }

    AdminDashboardKpiDTO ptSalesKpi(AdminDashboardDateRange range) {
        LocalDate from = range.getFromDate();
        LocalDate toExclusive = range.getToDate().plusDays(1);
        LocalDate prevFrom = range.getPreviousStart().toLocalDate();
        LocalDate prevToExclusive = range.getPreviousEnd().toLocalDate();
        BigDecimal current = bookingRepository.sumPaidPtBookingsInPeriod(from, toExclusive);
        BigDecimal previous = bookingRepository.sumPaidPtBookingsInPeriod(prevFrom, prevToExclusive);
        return AdminDashboardKpiDTO.of("pt-sales", "PT Sales", "currency",
                current, percentageChange(current, previous), true);
    }

    AdminDashboardKpiDTO dayPassKpi(AdminDashboardDateRange range) {
        BigDecimal current = receiptRepository.sumPaidByTransactionTypesInPeriod(
                List.of(DAY_PASS_TRANSACTION_TYPE), range.getStart(), range.getEnd());
        BigDecimal previous = receiptRepository.sumPaidByTransactionTypesInPeriod(
                List.of(DAY_PASS_TRANSACTION_TYPE), range.getPreviousStart(), range.getPreviousEnd());
        return AdminDashboardKpiDTO.of("day-pass", "Day Pass Revenue", "currency",
                current, percentageChange(current, previous), true);
    }

    AdminDashboardKpiDTO checkInsKpi(AdminDashboardDateRange range) {
        long current = attendanceRepository.countByDateRange(range.getStart(), range.getEnd());
        long previous = attendanceRepository.countByDateRange(range.getPreviousStart(), range.getPreviousEnd());
        // Not clickable in the existing frontend (no detail sheet case for it) — deliberately kept that way.
        return AdminDashboardKpiDTO.of("check-ins", "Total Check-ins", "count",
                BigDecimal.valueOf(current), percentageChange(BigDecimal.valueOf(current), BigDecimal.valueOf(previous)), false);
    }

    AdminDashboardKpiDTO activeMembersKpi() {
        // Current-state snapshot (not date-range-summed) — an active member count
        // can't be reconstructed historically without a status-history table, so
        // this always reflects the live count regardless of the selected range,
        // consistent with how DashboardService.getKPIs() treats it today.
        long active = memberRepository.countByMembershipStatus("active");
        return AdminDashboardKpiDTO.of("active-members", "Active Members", "count",
                BigDecimal.valueOf(active), null, true);
    }

    List<AdminDashboardKpiDTO> churnAndRetentionKpis(AdminDashboardDateRange range) {
        ChurnFigures current = churnFigures(range.getStart(), range.getEnd());
        ChurnFigures previous = churnFigures(range.getPreviousStart(), range.getPreviousEnd());

        AdminDashboardKpiDTO churn = AdminDashboardKpiDTO.of("churn-rate", "Churn Rate", "percent",
                current.churnRatePercent, percentageChange(current.churnRatePercent, previous.churnRatePercent), true);
        AdminDashboardKpiDTO retention = AdminDashboardKpiDTO.of("retention-rate", "Retention Rate", "percent",
                current.retentionRatePercent, percentageChange(current.retentionRatePercent, previous.retentionRatePercent), true);
        return List.of(churn, retention);
    }

    /**
     * Churn = members whose status turned "expired" with an expiry date inside the
     * window (same definition DashboardService.getMemberChurnData() already uses),
     * as a share of members estimated to have been active at the start of the
     * window (currently-active count + those that churned during the window —
     * there is no membership-status history table to derive the true historical
     * count from, so this is a documented approximation, not an invented metric).
     */
    ChurnFigures churnFigures(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        long churned = memberRepository.countByMembershipStatusAndExpiryDateBetween("expired", start, end);
        long activeNow = memberRepository.countByMembershipStatus("active");
        long baseline = activeNow + churned;
        BigDecimal churnRate = baseline == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(churned).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(baseline), 2, RoundingMode.HALF_UP);
        BigDecimal retentionRate = BigDecimal.valueOf(100).subtract(churnRate);
        return new ChurnFigures(churned, baseline, churnRate, retentionRate);
    }

    /** Same formula as DashboardService.calculatePercentageChange — reused, not reinvented. */
    static Double percentageChange(BigDecimal current, BigDecimal previous) {
        BigDecimal c = current != null ? current : BigDecimal.ZERO;
        BigDecimal p = previous != null ? previous : BigDecimal.ZERO;
        if (p.compareTo(BigDecimal.ZERO) == 0) {
            return c.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        return c.subtract(p).divide(p, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();
    }

    static final class ChurnFigures {
        final long churnedCount;
        final long baselineCount;
        final BigDecimal churnRatePercent;
        final BigDecimal retentionRatePercent;

        ChurnFigures(long churnedCount, long baselineCount, BigDecimal churnRatePercent, BigDecimal retentionRatePercent) {
            this.churnedCount = churnedCount;
            this.baselineCount = baselineCount;
            this.churnRatePercent = churnRatePercent;
            this.retentionRatePercent = retentionRatePercent;
        }
    }
}
