package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardBranchContextDTO;
import com.company.project.dto.mobile.dashboard.admin.AdminDashboardReportResponseDTO;
import com.company.project.dto.mobile.dashboard.admin.AdminDashboardResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.repositories.BranchRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Composition/orchestration layer for the Admin Dashboard. Resolves the shared
 * branch + date filter context once, then delegates each section to its own
 * independently-testable service and assembles their results — it deliberately
 * does not contain any KPI/alert/payment-mix/operational calculation itself.
 */
@Service
public class AdminDashboardService {

    private final AdminDashboardKpiService kpiService;
    private final AdminDashboardAlertService alertService;
    private final AdminDashboardPaymentMixService paymentMixService;
    private final AdminDashboardOperationalService operationalService;
    private final AdminDashboardReportService reportService;
    private final BranchRepository branchRepository;

    public AdminDashboardService(AdminDashboardKpiService kpiService,
                                  AdminDashboardAlertService alertService,
                                  AdminDashboardPaymentMixService paymentMixService,
                                  AdminDashboardOperationalService operationalService,
                                  AdminDashboardReportService reportService,
                                  BranchRepository branchRepository) {
        this.kpiService = kpiService;
        this.alertService = alertService;
        this.paymentMixService = paymentMixService;
        this.operationalService = operationalService;
        this.reportService = reportService;
        this.branchRepository = branchRepository;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponseDTO getDashboard(LocalDate from, LocalDate to) {
        AdminDashboardFilterContext ctx = resolveFilterContext(from, to);

        AdminDashboardResponseDTO response = new AdminDashboardResponseDTO();
        response.setBranch(new AdminDashboardBranchContextDTO(ctx.getBranchId(), ctx.getBranchName(), ctx.isAllBranches()));
        response.setFrom(ctx.getDateRange().getFromDate());
        response.setTo(ctx.getDateRange().getToDate());
        response.setCurrency("INR");
        response.setKpis(kpiService.getKpis(ctx));
        response.setAlerts(alertService.getAlerts(ctx));
        response.setPaymentMix(paymentMixService.getPaymentMix(ctx));
        response.setOperationalHighlights(operationalService.getOperationalHighlights(ctx));
        return response;
    }

    @Transactional(readOnly = true)
    public AdminDashboardReportResponseDTO getReport(String reportType, LocalDate from, LocalDate to,
                                                       int page, int pageSize) {
        AdminDashboardFilterContext ctx = resolveFilterContext(from, to);
        return reportService.getReport(reportType, ctx, page, pageSize);
    }

    /**
     * Branch scope comes from the ambient {@link BranchContextHolder} (set by the
     * existing {@code BranchContextFilter} from the {@code X-Active-Branch-Id}
     * header — already access-checked for the authenticated Admin by that
     * filter, and enforced on every query below via the Hibernate branch
     * filter). This method only resolves the branch's display name and
     * validates/defaults the date range, so every section gets an identical,
     * already-validated context object.
     */
    private AdminDashboardFilterContext resolveFilterContext(LocalDate from, LocalDate to) {
        Long branchId = BranchContextHolder.getActiveBranchId();
        String branchName = "All Branches";
        if (branchId != null) {
            Branch branch = branchRepository.findById(branchId)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown branch: " + branchId));
            branchName = branch.getBranchName();
        }

        AdminDashboardDateRange dateRange = (from == null && to == null)
                ? AdminDashboardDateRange.today()
                : AdminDashboardDateRange.of(from != null ? from : to, to != null ? to : from);

        return new AdminDashboardFilterContext(branchId, branchName, dateRange);
    }
}
