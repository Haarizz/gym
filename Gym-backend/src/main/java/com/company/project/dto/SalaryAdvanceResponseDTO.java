package com.company.project.dto;

import com.company.project.entities.SalaryAdvance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class SalaryAdvanceResponseDTO {

    private Long id;
    private String employeeId;
    private String employeeName;
    private String department;
    private LocalDate requestDate;
    private String advanceType;
    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private String approvalStatus;
    private String remarks;
    private BigDecimal totalDeducted;
    private BigDecimal balance;
    private Integer installmentCount;
    private BigDecimal installmentAmount;
    private LocalDate startMonth;
    private String deductionMode;
    private Boolean autoDeduct;
    private String status;
    private LocalDate nextDeductionDate;
    private String approvedBy;
    private LocalDate approvedDate;
    private String attachment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public SalaryAdvanceResponseDTO() {}

    public static SalaryAdvanceResponseDTO fromEntity(SalaryAdvance a) {
        SalaryAdvanceResponseDTO dto = new SalaryAdvanceResponseDTO();
        dto.setId(a.getId());
        dto.setEmployeeId(a.getEmployeeId());
        dto.setEmployeeName(a.getEmployeeName());
        dto.setDepartment(a.getDepartment());
        dto.setRequestDate(a.getRequestDate());
        dto.setAdvanceType(a.getAdvanceType());
        dto.setRequestedAmount(a.getRequestedAmount());
        dto.setApprovedAmount(a.getApprovedAmount());
        dto.setApprovalStatus(a.getApprovalStatus());
        dto.setRemarks(a.getRemarks());
        dto.setTotalDeducted(a.getTotalDeducted());
        dto.setBalance(a.getBalance());
        dto.setInstallmentCount(a.getInstallmentCount());
        dto.setInstallmentAmount(a.getInstallmentAmount());
        dto.setStartMonth(a.getStartMonth());
        dto.setDeductionMode(a.getDeductionMode());
        dto.setAutoDeduct(a.getAutoDeduct());
        dto.setStatus(a.getStatus());
        dto.setNextDeductionDate(a.getNextDeductionDate());
        dto.setApprovedBy(a.getApprovedBy());
        dto.setApprovedDate(a.getApprovedDate());
        dto.setAttachment(a.getAttachment());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setUpdatedAt(a.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public LocalDate getRequestDate() { return requestDate; }
    public void setRequestDate(LocalDate requestDate) { this.requestDate = requestDate; }

    public String getAdvanceType() { return advanceType; }
    public void setAdvanceType(String advanceType) { this.advanceType = advanceType; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public BigDecimal getApprovedAmount() { return approvedAmount; }
    public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public BigDecimal getTotalDeducted() { return totalDeducted; }
    public void setTotalDeducted(BigDecimal totalDeducted) { this.totalDeducted = totalDeducted; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public Integer getInstallmentCount() { return installmentCount; }
    public void setInstallmentCount(Integer installmentCount) { this.installmentCount = installmentCount; }

    public BigDecimal getInstallmentAmount() { return installmentAmount; }
    public void setInstallmentAmount(BigDecimal installmentAmount) { this.installmentAmount = installmentAmount; }

    public LocalDate getStartMonth() { return startMonth; }
    public void setStartMonth(LocalDate startMonth) { this.startMonth = startMonth; }

    public String getDeductionMode() { return deductionMode; }
    public void setDeductionMode(String deductionMode) { this.deductionMode = deductionMode; }

    public Boolean getAutoDeduct() { return autoDeduct; }
    public void setAutoDeduct(Boolean autoDeduct) { this.autoDeduct = autoDeduct; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getNextDeductionDate() { return nextDeductionDate; }
    public void setNextDeductionDate(LocalDate nextDeductionDate) { this.nextDeductionDate = nextDeductionDate; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public LocalDate getApprovedDate() { return approvedDate; }
    public void setApprovedDate(LocalDate approvedDate) { this.approvedDate = approvedDate; }

    public String getAttachment() { return attachment; }
    public void setAttachment(String attachment) { this.attachment = attachment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
