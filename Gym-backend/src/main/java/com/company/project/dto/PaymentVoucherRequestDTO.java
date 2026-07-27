package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class PaymentVoucherRequestDTO {

    private String supplierName;
    private String supplierType;
    private String billNo;
    private LocalDate paymentDate;
    private BigDecimal amount;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown; // legs when paymentMethod == "Mixed"
    private String status;
    private String description;
    private String bankAccount;
    private String chequeNo;
    private LocalDate chequeDate;
    private String notes;
    private List<PaymentVoucherBillDTO> bills;

    public PaymentVoucherRequestDTO() {}

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
}
