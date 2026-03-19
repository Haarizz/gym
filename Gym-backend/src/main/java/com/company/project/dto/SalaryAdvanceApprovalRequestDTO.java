package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class SalaryAdvanceApprovalRequestDTO {

    private BigDecimal approvedAmount;
    private String approvalStatus; // Approved / Rejected
    private Integer installmentCount;
    private String deductionMode;
    private LocalDate startMonth;
    private Boolean autoDeduct;
    private String approvalRemarks;
    private String approvedBy;

    public SalaryAdvanceApprovalRequestDTO() {}

    public BigDecimal getApprovedAmount() { return approvedAmount; }
    public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public Integer getInstallmentCount() { return installmentCount; }
    public void setInstallmentCount(Integer installmentCount) { this.installmentCount = installmentCount; }

    public String getDeductionMode() { return deductionMode; }
    public void setDeductionMode(String deductionMode) { this.deductionMode = deductionMode; }

    public LocalDate getStartMonth() { return startMonth; }
    public void setStartMonth(LocalDate startMonth) { this.startMonth = startMonth; }

    public Boolean getAutoDeduct() { return autoDeduct; }
    public void setAutoDeduct(Boolean autoDeduct) { this.autoDeduct = autoDeduct; }

    public String getApprovalRemarks() { return approvalRemarks; }
    public void setApprovalRemarks(String approvalRemarks) { this.approvalRemarks = approvalRemarks; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
}
