package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.hibernate.annotations.Filter;

/** A deduction charged to an employee's payroll; amount is per month (Fixed amount, % of basic, or amount x quantity for Per Day / Per Hour types). */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "employee_deductions")
public class EmployeeDeduction extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "type_id", nullable = false)
    private Long typeId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "quantity", nullable = false, precision = 8, scale = 2)
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "frequency", nullable = false)
    private String frequency = "One-Time";

    @Column(name = "installments", nullable = false)
    private Integer installments = 1;

    @Column(name = "completed_installments", nullable = false)
    private Integer completedInstallments = 0;

    @Column(name = "start_month", nullable = false)
    private LocalDate startMonth;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "status", nullable = false)
    private String status = "Pending";

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    // The salary month this deduction was last taken from (payroll or a manual salary payment).
    @Column(name = "last_applied_month")
    private LocalDate lastAppliedMonth;

    @Column(name = "branch_id")
    private Long branchId;

    public LocalDate getLastAppliedMonth() { return lastAppliedMonth; }
    public void setLastAppliedMonth(LocalDate lastAppliedMonth) { this.lastAppliedMonth = lastAppliedMonth; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }
    public Long getTypeId() { return typeId; }
    public void setTypeId(Long typeId) { this.typeId = typeId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public Integer getInstallments() { return installments; }
    public void setInstallments(Integer installments) { this.installments = installments; }
    public Integer getCompletedInstallments() { return completedInstallments; }
    public void setCompletedInstallments(Integer completedInstallments) { this.completedInstallments = completedInstallments; }
    public LocalDate getStartMonth() { return startMonth; }
    public void setStartMonth(LocalDate startMonth) { this.startMonth = startMonth; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
