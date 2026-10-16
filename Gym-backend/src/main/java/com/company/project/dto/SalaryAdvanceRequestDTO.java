package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class SalaryAdvanceRequestDTO {

    private String employeeId;
    private String employeeName;
    private String department;
    private LocalDate requestDate;
    private String advanceType;
    private BigDecimal requestedAmount;
    private String remarks;
    private String attachment;
    // Proposed repayment plan; the approver can change it.
    private Integer installmentCount;
    private LocalDate startMonth;
    private Boolean autoDeduct;

    public Integer getInstallmentCount() { return installmentCount; }
    public void setInstallmentCount(Integer installmentCount) { this.installmentCount = installmentCount; }
    public LocalDate getStartMonth() { return startMonth; }
    public void setStartMonth(LocalDate startMonth) { this.startMonth = startMonth; }
    public Boolean getAutoDeduct() { return autoDeduct; }
    public void setAutoDeduct(Boolean autoDeduct) { this.autoDeduct = autoDeduct; }

    public SalaryAdvanceRequestDTO() {}

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

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getAttachment() { return attachment; }
    public void setAttachment(String attachment) { this.attachment = attachment; }
}
