package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class SalaryPaymentRequestDTO {

    private String employeeId;
    private String employeeName;
    private String month;
    private Integer year;
    private BigDecimal netSalary;
    private List<SplitPaymentDTO> splitPayments;
    private LocalDate paymentDate;
    private String notes;
    private String processedBy;

    public SalaryPaymentRequestDTO() {}

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public BigDecimal getNetSalary() { return netSalary; }
    public void setNetSalary(BigDecimal netSalary) { this.netSalary = netSalary; }

    public List<SplitPaymentDTO> getSplitPayments() { return splitPayments; }
    public void setSplitPayments(List<SplitPaymentDTO> splitPayments) { this.splitPayments = splitPayments; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }
}
