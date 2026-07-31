package com.company.project.dto;

import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.PaymentVoucherBill;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class PaymentVoucherResponseDTO {

    private Long id;
    private String voucherNo;
    private String supplierName;
    private String supplierType;
    private String billNo;
    private LocalDate paymentDate;
    private BigDecimal amount;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String status;
    private String description;
    private String bankAccount;
    private String chequeNo;
    private LocalDate chequeDate;
    private String notes;
    private List<PaymentVoucherBillDTO> bills;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    public PaymentVoucherResponseDTO() {}

    public static PaymentVoucherResponseDTO fromEntity(PaymentVoucher pv, List<PaymentVoucherBill> bills) {
        PaymentVoucherResponseDTO dto = new PaymentVoucherResponseDTO();
        dto.setId(pv.getId());
        dto.setVoucherNo(pv.getVoucherNo());
        dto.setSupplierName(pv.getSupplierName());
        dto.setSupplierType(pv.getSupplierType());
        dto.setBillNo(pv.getBillNo());
        dto.setPaymentDate(pv.getPaymentDate());
        dto.setAmount(pv.getAmount());
        dto.setPaymentMethod(pv.getPaymentMethod());
        dto.setPaymentBreakdown(pv.getPaymentBreakdown());
        dto.setStatus(pv.getStatus());
        dto.setDescription(pv.getDescription());
        dto.setBankAccount(pv.getBankAccount());
        dto.setChequeNo(pv.getChequeNo());
        dto.setChequeDate(pv.getChequeDate());
        dto.setNotes(pv.getNotes());
        dto.setBills(bills.stream().map(PaymentVoucherBillDTO::fromEntity).collect(Collectors.toList()));
        dto.setCreatedAt(pv.getCreatedAt());
        dto.setUpdatedAt(pv.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getSupplierType() { return supplierType; }
    public void setSupplierType(String supplierType) { this.supplierType = supplierType; }

    public String getBillNo() { return billNo; }
    public void setBillNo(String billNo) { this.billNo = billNo; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getBankAccount() { return bankAccount; }
    public void setBankAccount(String bankAccount) { this.bankAccount = bankAccount; }

    public String getChequeNo() { return chequeNo; }
    public void setChequeNo(String chequeNo) { this.chequeNo = chequeNo; }

    public LocalDate getChequeDate() { return chequeDate; }
    public void setChequeDate(LocalDate chequeDate) { this.chequeDate = chequeDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<PaymentVoucherBillDTO> getBills() { return bills; }
    public void setBills(List<PaymentVoucherBillDTO> bills) { this.bills = bills; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
