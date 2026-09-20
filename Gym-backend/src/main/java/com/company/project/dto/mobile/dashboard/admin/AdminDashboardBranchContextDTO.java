package com.company.project.dto.mobile.dashboard.admin;

public class AdminDashboardBranchContextDTO {

    private Long branchId;
    private String branchName;
    private boolean allBranches;

    public AdminDashboardBranchContextDTO() {}

    public AdminDashboardBranchContextDTO(Long branchId, String branchName, boolean allBranches) {
        this.branchId = branchId;
        this.branchName = branchName;
        this.allBranches = allBranches;
    }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public boolean isAllBranches() { return allBranches; }
    public void setAllBranches(boolean allBranches) { this.allBranches = allBranches; }
}
