package com.company.project.services.mobile.dashboard.admin;

/**
 * The resolved, validated branch + date scope shared by every admin dashboard
 * sub-service, so KPI, alert, payment-mix, operational and report calculations
 * can never drift out of sync with each other for the same request.
 *
 * Branch scope itself is NOT re-implemented here — it is inherited from the
 * request's ambient {@link com.company.project.security.BranchContextHolder}
 * (set by the existing {@code BranchContextFilter} from the
 * {@code X-Active-Branch-Id} header, already access-checked for the
 * authenticated Admin by that filter). This context just carries the resolved
 * display name alongside the date range for building response DTOs.
 */
public final class AdminDashboardFilterContext {

    private final Long branchId;
    private final String branchName;
    private final boolean allBranches;
    private final AdminDashboardDateRange dateRange;

    public AdminDashboardFilterContext(Long branchId, String branchName, AdminDashboardDateRange dateRange) {
        this.branchId = branchId;
        this.branchName = branchName;
        this.allBranches = branchId == null;
        this.dateRange = dateRange;
    }

    public Long getBranchId() { return branchId; }
    public String getBranchName() { return branchName; }
    public boolean isAllBranches() { return allBranches; }
    public AdminDashboardDateRange getDateRange() { return dateRange; }
}
