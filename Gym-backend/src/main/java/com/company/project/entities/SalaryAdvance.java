package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "salary_advances")
public class SalaryAdvance extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id")
    private String employeeId;

    @Column(name = "employee_name")
    private String employeeName;

    private String department;

    @Column(name = "request_date")
    private LocalDate requestDate;

    @Column(name = "advance_type")
    private String advanceType;

    @Column(name = "requested_amount", precision = 12, scale = 2)
    private BigDecimal requestedAmount = BigDecimal.ZERO;

    @Column(name = "approved_amount", precision = 12, scale = 2)
    private BigDecimal approvedAmount = BigDecimal.ZERO;

    @Column(name = "approval_status")
    private String approvalStatus = "Pending";

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "total_deducted", precision = 12, scale = 2)
    private BigDecimal totalDeducted = BigDecimal.ZERO;

    @Column(name = "balance", precision = 12, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "installment_count")
    private Integer installmentCount = 0;

    @Column(name = "installment_amount", precision = 12, scale = 2)
    private BigDecimal installmentAmount = BigDecimal.ZERO;

    @Column(name = "start_month")
    private LocalDate startMonth;

    @Column(name = "deduction_mode")
    private String deductionMode = "Monthly";

    @Column(name = "auto_deduct")
    private Boolean autoDeduct = true;

    @Column(name = "status")
    private String status = "Pending Approval";

    @Column(name = "next_deduction_date")
    private LocalDate nextDeductionDate;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    private String attachment;

    public SalaryAdvance() {}

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

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
