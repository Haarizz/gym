package com.company.project.dto;

import com.company.project.entities.SalaryPaymentEmployee;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class SalaryPaymentEmployeeResponseDTO {

    private Long id;
    private String employeeId;
    private String employeeName;
    private String department;
    private String designation;
    private BigDecimal baseSalary;
    private BigDecimal allowances;
    private BigDecimal deductions;
    private BigDecimal netSalary;
    private String paymentStatus;
    private LocalDate lastPaymentDate;
    private String bankAccount;
    private String email;
    // From the month's payroll run, when there is one.
    private Long payrollRunId;
    private Long payrollRunLineId;
    private String payrollRunStatus;
    private BigDecimal grossPay;
    public Long getPayrollRunId() { return payrollRunId; }
    public void setPayrollRunId(Long payrollRunId) { this.payrollRunId = payrollRunId; }
    public Long getPayrollRunLineId() { return payrollRunLineId; }
    public void setPayrollRunLineId(Long payrollRunLineId) { this.payrollRunLineId = payrollRunLineId; }
    public String getPayrollRunStatus() { return payrollRunStatus; }
    public void setPayrollRunStatus(String payrollRunStatus) { this.payrollRunStatus = payrollRunStatus; }
    public BigDecimal getGrossPay() { return grossPay; }
    public void setGrossPay(BigDecimal grossPay) { this.grossPay = grossPay; }
    // Without a payroll line: the month's items a payment would cover ({key, kind, label, amount, ref_id}).
    private java.util.List<java.util.Map<String, Object>> items;
    // Whether this gym has ever run payroll (the "no payroll this month" hint is only shown then).
    private Boolean payrollUsed;
    public java.util.List<java.util.Map<String, Object>> getItems() { return items; }
    public void setItems(java.util.List<java.util.Map<String, Object>> items) { this.items = items; }
    public Boolean getPayrollUsed() { return payrollUsed; }
    public void setPayrollUsed(Boolean payrollUsed) { this.payrollUsed = payrollUsed; }
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    public SalaryPaymentEmployeeResponseDTO() {}

    public static SalaryPaymentEmployeeResponseDTO fromEntity(SalaryPaymentEmployee e) {
        SalaryPaymentEmployeeResponseDTO dto = new SalaryPaymentEmployeeResponseDTO();
        dto.setId(e.getId());
        dto.setEmployeeId(e.getEmployeeId());
        dto.setEmployeeName(e.getEmployeeName());
        dto.setDepartment(e.getDepartment());
        dto.setDesignation(e.getDesignation());
        dto.setBaseSalary(e.getBaseSalary());
        dto.setAllowances(e.getAllowances());
        dto.setDeductions(e.getDeductions());
        dto.setNetSalary(e.getNetSalary());
        dto.setPaymentStatus(e.getPaymentStatus());
        dto.setLastPaymentDate(e.getLastPaymentDate());
        dto.setBankAccount(e.getBankAccount());
        dto.setEmail(e.getEmail());
        dto.setCreatedAt(e.getCreatedAt());
        dto.setUpdatedAt(e.getUpdatedAt());
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

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public BigDecimal getBaseSalary() { return baseSalary; }
    public void setBaseSalary(BigDecimal baseSalary) { this.baseSalary = baseSalary; }

    public BigDecimal getAllowances() { return allowances; }
    public void setAllowances(BigDecimal allowances) { this.allowances = allowances; }

    public BigDecimal getDeductions() { return deductions; }
    public void setDeductions(BigDecimal deductions) { this.deductions = deductions; }

    public BigDecimal getNetSalary() { return netSalary; }
    public void setNetSalary(BigDecimal netSalary) { this.netSalary = netSalary; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public LocalDate getLastPaymentDate() { return lastPaymentDate; }
    public void setLastPaymentDate(LocalDate lastPaymentDate) { this.lastPaymentDate = lastPaymentDate; }

    public String getBankAccount() { return bankAccount; }
    public void setBankAccount(String bankAccount) { this.bankAccount = bankAccount; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
