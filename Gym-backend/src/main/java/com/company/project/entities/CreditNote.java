package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Member-side refund/adjustment — reduces previously recognized revenue and
 * refunds cash/bank. Distinct from onSaleRefunded() (POS-specific, reverses a
 * whole SaleTransaction); this covers membership/add-on fee adjustments that
 * have no POS transaction behind them.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "credit_notes")
public class CreditNote extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_no", unique = true, nullable = false)
    private String voucherNo;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "member_db_id")
    private Long memberDbId;

    @Column(name = "member_name")
    private String memberName;

    /** Receipt this adjustment relates to — nullable, informational only. */
    @Column(name = "linked_receipt_id")
    private Long linkedReceiptId;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "subtotal", precision = 12, scale = 2, nullable = false)
    private BigDecimal subtotal;

    @Column(name = "tax_amount", precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    /** How the refund left the business — Cash / Bank. */
    @Column(name = "refund_method")
    private String refundMethod = "Cash";

    // DRAFT | POSTED | CANCELLED
    @Column(name = "status", nullable = false)
    private String status = "DRAFT";

    public CreditNote() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public Long getLinkedReceiptId() { return linkedReceiptId; }
    public void setLinkedReceiptId(Long linkedReceiptId) { this.linkedReceiptId = linkedReceiptId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    // ── Billing › Refunds (V136) ─────────────────────────────────────────────
    /** "BILLING_REFUND" when made from the Refunds tab; null for Financials credit notes / imports. */
    @Column(name = "source", length = 30)
    private String source;

    @Column(name = "reason_code", length = 40)
    private String reasonCode;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "cancelled_plan", nullable = false)
    private boolean cancelledPlan = false;

    @Column(name = "due_cleared", precision = 12, scale = 2)
    private BigDecimal dueCleared;

    @Column(name = "bank_account_code", length = 50)
    private String bankAccountCode;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "refund_reference", length = 120)
    private String refundReference;

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getReasonCode() { return reasonCode; }
    public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isCancelledPlan() { return cancelledPlan; }
    public void setCancelledPlan(boolean cancelledPlan) { this.cancelledPlan = cancelledPlan; }
    public BigDecimal getDueCleared() { return dueCleared; }
    public void setDueCleared(BigDecimal dueCleared) { this.dueCleared = dueCleared; }
    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }
    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }
    public String getRefundReference() { return refundReference; }
    public void setRefundReference(String refundReference) { this.refundReference = refundReference; }

}
