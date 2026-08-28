package com.company.project.dto;

import java.math.BigDecimal;

// One row per branch on the BiOS "Branch Comparison" section — only meaningful
// when the caller is viewing "All Branches" (see BranchContextFilter: the
// Hibernate branch filter is only disabled for an admin with no active branch
// header set, so this is the one endpoint that can see every branch's rows
// in a single request).
public class BiosBranchComparisonDTO {
    private String branchId;
    private String branchName;
    private String branchCode;
    private long totalMembers;
    private long activeMembers;
    private double retentionPercent;
    private BigDecimal monthRevenue;

    public BiosBranchComparisonDTO(String branchId, String branchName, String branchCode,
                                    long totalMembers, long activeMembers, double retentionPercent,
                                    BigDecimal monthRevenue) {
        this.branchId = branchId;
        this.branchName = branchName;
        this.branchCode = branchCode;
        this.totalMembers = totalMembers;
        this.activeMembers = activeMembers;
        this.retentionPercent = retentionPercent;
        this.monthRevenue = monthRevenue;
    }

    public String getBranchId() { return branchId; }
    public String getBranchName() { return branchName; }
    public String getBranchCode() { return branchCode; }
    public long getTotalMembers() { return totalMembers; }
    public long getActiveMembers() { return activeMembers; }
    public double getRetentionPercent() { return retentionPercent; }
    public BigDecimal getMonthRevenue() { return monthRevenue; }
}
