package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.hibernate.annotations.Filter;

/** A processed or skipped salary advance installment. */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "advance_repayments")
public class AdvanceRepayment extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "advance_id", nullable = false)
    private Long advanceId;

    @Column(name = "installment_no")
    private Integer installmentNo;

    @Column(name = "period_month", nullable = false)
    private LocalDate periodMonth;

    @Column(name = "scheduled_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal scheduledAmount = BigDecimal.ZERO;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "balance_before", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceBefore = BigDecimal.ZERO;

    @Column(name = "balance_after", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceAfter = BigDecimal.ZERO;

    @Column(name = "status", nullable = false)
    private String status = "Processed";

    @Column(name = "source", nullable = false)
    private String source = "manual";

    @Column(name = "payroll_run_id")
    private Long payrollRunId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "branch_id")
    private Long branchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAdvanceId() { return advanceId; }
    public void setAdvanceId(Long advanceId) { this.advanceId = advanceId; }
    public Integer getInstallmentNo() { return installmentNo; }
    public void setInstallmentNo(Integer installmentNo) { this.installmentNo = installmentNo; }
    public LocalDate getPeriodMonth() { return periodMonth; }
    public void setPeriodMonth(LocalDate periodMonth) { this.periodMonth = periodMonth; }
    public BigDecimal getScheduledAmount() { return scheduledAmount; }
    public void setScheduledAmount(BigDecimal scheduledAmount) { this.scheduledAmount = scheduledAmount; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getBalanceBefore() { return balanceBefore; }
    public void setBalanceBefore(BigDecimal balanceBefore) { this.balanceBefore = balanceBefore; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getPayrollRunId() { return payrollRunId; }
    public void setPayrollRunId(Long payrollRunId) { this.payrollRunId = payrollRunId; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
