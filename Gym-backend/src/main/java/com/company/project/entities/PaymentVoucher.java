package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "payment_vouchers")
public class PaymentVoucher extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_no", unique = true, nullable = false)
    private String voucherNo;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "supplier_type")
    private String supplierType;

    @Column(name = "bill_no")
    private String billNo;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "status")
    private String status;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "bank_account")
    private String bankAccount;

    @Column(name = "cheque_no")
    private String chequeNo;

    @Column(name = "cheque_date")
    private LocalDate chequeDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public PaymentVoucher() {}

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
}
