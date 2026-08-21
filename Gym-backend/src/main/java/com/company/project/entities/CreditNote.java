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

    @jakarta.persistence.PrePersist
    public void prePersistBranchId() {
        if (this.branchId == null) {
            Long activeBranch = com.company.project.security.BranchContextHolder.getActiveBranchId();
            if (activeBranch != null) {
                this.branchId = activeBranch;
            }
        }
    }
}
