package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** One employee on a payroll run; breakdownJson keeps the itemised allowances, deductions and advance installments shown on the payslip. */
@Entity
@Table(name = "payroll_run_lines")
public class PayrollRunLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false)
    private Long runId;

    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "employee_code")
    private String employeeCode;

    @Column(name = "employee_name")
    private String employeeName;

    @Column(name = "designation")
    private String designation;

    @Column(name = "department")
    private String department;

    @Column(name = "basic_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal basicSalary = BigDecimal.ZERO;

    @Column(name = "allowances", nullable = false, precision = 12, scale = 2)
    private BigDecimal allowances = BigDecimal.ZERO;

    @Column(name = "scheduled_days", nullable = false, precision = 6, scale = 2)
    private BigDecimal scheduledDays = BigDecimal.ZERO;

    @Column(name = "present_days", nullable = false, precision = 6, scale = 2)
    private BigDecimal presentDays = BigDecimal.ZERO;

    @Column(name = "absent_days", nullable = false, precision = 6, scale = 2)
    private BigDecimal absentDays = BigDecimal.ZERO;

    @Column(name = "paid_leave_days", nullable = false, precision = 6, scale = 2)
    private BigDecimal paidLeaveDays = BigDecimal.ZERO;

    @Column(name = "unpaid_leave_days", nullable = false, precision = 6, scale = 2)
    private BigDecimal unpaidLeaveDays = BigDecimal.ZERO;

    @Column(name = "late_count", nullable = false)
    private Integer lateCount = 0;

    @Column(name = "scheduled_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal scheduledHours = BigDecimal.ZERO;

    @Column(name = "actual_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal actualHours = BigDecimal.ZERO;

    @Column(name = "regular_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal regularHours = BigDecimal.ZERO;

    @Column(name = "approved_ot_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal approvedOtHours = BigDecimal.ZERO;

    @Column(name = "ot_pay", nullable = false, precision = 12, scale = 2)
    private BigDecimal otPay = BigDecimal.ZERO;

    @Column(name = "commission", nullable = false, precision = 12, scale = 2)
    private BigDecimal commission = BigDecimal.ZERO;

    @Column(name = "attendance_deduction", nullable = false, precision = 12, scale = 2)
    private BigDecimal attendanceDeduction = BigDecimal.ZERO;

    @Column(name = "advance_repayment", nullable = false, precision = 12, scale = 2)
    private BigDecimal advanceRepayment = BigDecimal.ZERO;

    @Column(name = "other_deductions", nullable = false, precision = 12, scale = 2)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    @Column(name = "gross_pay", nullable = false, precision = 12, scale = 2)
    private BigDecimal grossPay = BigDecimal.ZERO;

    @Column(name = "net_pay", nullable = false, precision = 12, scale = 2)
    private BigDecimal netPay = BigDecimal.ZERO;

    @Column(name = "breakdown_json", columnDefinition = "TEXT")
    private String breakdownJson;

    // Set when the line is paid in Salary Payments (or settled with nothing to pay).
    @Column(name = "salary_payment_id")
    private Long salaryPaymentId;

    @Column(name = "paid_at")
    private java.time.LocalDateTime paidAt;

    public Long getSalaryPaymentId() { return salaryPaymentId; }
    public void setSalaryPaymentId(Long salaryPaymentId) { this.salaryPaymentId = salaryPaymentId; }
    public java.time.LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(java.time.LocalDateTime paidAt) { this.paidAt = paidAt; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getRunId() { return runId; }
    public void setRunId(Long runId) { this.runId = runId; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }
    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }
    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public BigDecimal getBasicSalary() { return basicSalary; }
    public void setBasicSalary(BigDecimal basicSalary) { this.basicSalary = basicSalary; }
    public BigDecimal getAllowances() { return allowances; }
    public void setAllowances(BigDecimal allowances) { this.allowances = allowances; }
    public BigDecimal getScheduledDays() { return scheduledDays; }
    public void setScheduledDays(BigDecimal scheduledDays) { this.scheduledDays = scheduledDays; }
    public BigDecimal getPresentDays() { return presentDays; }
    public void setPresentDays(BigDecimal presentDays) { this.presentDays = presentDays; }
    public BigDecimal getAbsentDays() { return absentDays; }
    public void setAbsentDays(BigDecimal absentDays) { this.absentDays = absentDays; }
    public BigDecimal getPaidLeaveDays() { return paidLeaveDays; }
    public void setPaidLeaveDays(BigDecimal paidLeaveDays) { this.paidLeaveDays = paidLeaveDays; }
    public BigDecimal getUnpaidLeaveDays() { return unpaidLeaveDays; }
    public void setUnpaidLeaveDays(BigDecimal unpaidLeaveDays) { this.unpaidLeaveDays = unpaidLeaveDays; }
    public Integer getLateCount() { return lateCount; }
    public void setLateCount(Integer lateCount) { this.lateCount = lateCount; }
    public BigDecimal getScheduledHours() { return scheduledHours; }
    public void setScheduledHours(BigDecimal scheduledHours) { this.scheduledHours = scheduledHours; }
    public BigDecimal getActualHours() { return actualHours; }
    public void setActualHours(BigDecimal actualHours) { this.actualHours = actualHours; }
    public BigDecimal getRegularHours() { return regularHours; }
    public void setRegularHours(BigDecimal regularHours) { this.regularHours = regularHours; }
    public BigDecimal getApprovedOtHours() { return approvedOtHours; }
    public void setApprovedOtHours(BigDecimal approvedOtHours) { this.approvedOtHours = approvedOtHours; }
    public BigDecimal getOtPay() { return otPay; }
    public void setOtPay(BigDecimal otPay) { this.otPay = otPay; }
    public BigDecimal getCommission() { return commission; }
    public void setCommission(BigDecimal commission) { this.commission = commission; }
    public BigDecimal getAttendanceDeduction() { return attendanceDeduction; }
    public void setAttendanceDeduction(BigDecimal attendanceDeduction) { this.attendanceDeduction = attendanceDeduction; }
    public BigDecimal getAdvanceRepayment() { return advanceRepayment; }
    public void setAdvanceRepayment(BigDecimal advanceRepayment) { this.advanceRepayment = advanceRepayment; }
    public BigDecimal getOtherDeductions() { return otherDeductions; }
    public void setOtherDeductions(BigDecimal otherDeductions) { this.otherDeductions = otherDeductions; }
    public BigDecimal getGrossPay() { return grossPay; }
    public void setGrossPay(BigDecimal grossPay) { this.grossPay = grossPay; }
    public BigDecimal getNetPay() { return netPay; }
    public void setNetPay(BigDecimal netPay) { this.netPay = netPay; }
    public String getBreakdownJson() { return breakdownJson; }
    public void setBreakdownJson(String breakdownJson) { this.breakdownJson = breakdownJson; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
