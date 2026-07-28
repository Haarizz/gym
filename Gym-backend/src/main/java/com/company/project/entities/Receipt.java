package com.company.project.entities;

import com.company.project.converters.PaymentBreakdownConverter;
import com.company.project.dto.PaymentSplitDTO;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "receipts")
public class Receipt extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // auto-generated: RCPT-XXXXXXXXXX
    @Column(name = "receipt_no", unique = true)
    private String receiptNo;

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    // FK to members.id (not enforced for simplicity)
    @Column(name = "member_db_id")
    private Long memberDbId;

    // MBR-XXXXXXXXXX
    @Column(name = "member_id")
    private String memberId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "member_phone")
    private String memberPhone;

    // "New" | "Renewal" | "Add-on" | "Daily Entry"
    @Column(name = "transaction_type")
    private String transactionType;

    @Column(precision = 10, scale = 2)
    private BigDecimal amount;

    // "Cash" | "Card" | "Online" | "Wallet" | "Bank Transfer"
    @Column(name = "payment_method")
    private String paymentMethod;

    // "Paid" | "Pending"
    private String status;

    @Column(name = "plan_name")
    private String planName;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_till")
    private LocalDateTime validTill;

    @Column(name = "processed_by")
    private String processedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    // "Individual" | "Family" | "Corporate"
    @Column(name = "membership_type")
    private String membershipType;

    // Partial-payment tracking
    @Column(name = "paid_amount", precision = 10, scale = 2)
    private BigDecimal paidAmount;

    // When this bill/invoice is due (for pending receipts)
    @Column(name = "due_date")
    private LocalDateTime dueDate;

    // Per-leg breakdown when paymentMethod == "Mixed", e.g. [{method:"Cash",amount:500}, {method:"Card",amount:500}]
    @Column(name = "payment_breakdown", columnDefinition = "TEXT")
    @Convert(converter = PaymentBreakdownConverter.class)
    private List<PaymentSplitDTO> paymentBreakdown;

    // Specific ledger bank account (from account_heads) credited for a Bank Transfer
    // receipt — lets the journal entry hit the exact account instead of the generic
    // "Cash at Bank" bucket. Null for every other payment method.
    @Column(name = "bank_account_code")
    private String bankAccountCode;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    public Receipt() {}

    // ── Getters & Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReceiptNo() { return receiptNo; }
    public void setReceiptNo(String receiptNo) { this.receiptNo = receiptNo; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMemberPhone() { return memberPhone; }
    public void setMemberPhone(String memberPhone) { this.memberPhone = memberPhone; }

    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime validFrom) { this.validFrom = validFrom; }

    public LocalDateTime getValidTill() { return validTill; }
    public void setValidTill(LocalDateTime validTill) { this.validTill = validTill; }

    public String getProcessedBy() { return processedBy; }
    public void setProcessedBy(String processedBy) { this.processedBy = processedBy; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }
}
