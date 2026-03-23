package com.company.project.dto;

import com.company.project.entities.PaymentVoucherBill;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PaymentVoucherBillDTO {

    private Long id;
    private String billNo;
    private LocalDate billDate;
    private BigDecimal originalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingBalance;
    private LocalDate dueDate;
    private String status;

    public PaymentVoucherBillDTO() {}

    public static PaymentVoucherBillDTO fromEntity(PaymentVoucherBill b) {
        PaymentVoucherBillDTO dto = new PaymentVoucherBillDTO();
        dto.setId(b.getId());
        dto.setBillNo(b.getBillNo());
        dto.setBillDate(b.getBillDate());
        dto.setOriginalAmount(b.getOriginalAmount());
        dto.setPaidAmount(b.getPaidAmount());
        dto.setRemainingBalance(b.getRemainingBalance());
        dto.setDueDate(b.getDueDate());
        dto.setStatus(b.getStatus());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBillNo() { return billNo; }
    public void setBillNo(String billNo) { this.billNo = billNo; }

    public LocalDate getBillDate() { return billDate; }
    public void setBillDate(LocalDate billDate) { this.billDate = billDate; }

    public BigDecimal getOriginalAmount() { return originalAmount; }
    public void setOriginalAmount(BigDecimal originalAmount) { this.originalAmount = originalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getRemainingBalance() { return remainingBalance; }
    public void setRemainingBalance(BigDecimal remainingBalance) { this.remainingBalance = remainingBalance; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
