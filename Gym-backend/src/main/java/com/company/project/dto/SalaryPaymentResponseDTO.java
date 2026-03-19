package com.company.project.dto;

import com.company.project.entities.SalaryPayment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class SalaryPaymentResponseDTO {

    private Long id;
    private String employeeId;
    private String employeeName;
    private String month;
    private Integer year;
    private BigDecimal netSalary;
    private List<SplitPaymentDTO> splitPayments;
    private LocalDate paymentDate;
    private String notes;
    private String status;
    private String processedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public SalaryPaymentResponseDTO() {}

    public static SalaryPaymentResponseDTO fromEntity(SalaryPayment p, List<SplitPaymentDTO> splitPayments) {
        SalaryPaymentResponseDTO dto = new SalaryPaymentResponseDTO();
        dto.setId(p.getId());
        dto.setEmployeeId(p.getEmployeeId());
        dto.setEmployeeName(p.getEmployeeName());
        dto.setMonth(p.getMonth());
        dto.setYear(p.getYear());
        dto.setNetSalary(p.getNetSalary());
        dto.setSplitPayments(splitPayments);
        dto.setPaymentDate(p.getPaymentDate());
        dto.setNotes(p.getNotes());
        dto.setStatus(p.getStatus());
        dto.setProcessedBy(p.getProcessedBy());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
