package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * A (full or partial) return against a POS sale. Restocks the returned lines and
 * reverses revenue/VAT/COGS for the returned portion only.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_sale_returns")
public class PosSaleReturn extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "return_number", length = 50)
    private String returnNumber;

    @Column(name = "transaction_id", nullable = false)
    private Long transactionId;

    @Column(name = "transaction_number", length = 50)
    private String transactionNumber;

    @Column(name = "pos_session_id")
    private Long posSessionId;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "subtotal", precision = 12, scale = 2, nullable = false)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "total_cogs", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalCogs = BigDecimal.ZERO;

    @Column(name = "refund_method", length = 30)
    private String refundMethod;

    @Convert(converter = com.company.project.converters.PaymentBreakdownConverter.class)
    @Column(name = "refund_breakdown", columnDefinition = "TEXT")
    private java.util.List<com.company.project.dto.PaymentSplitDTO> refundBreakdown;

    @Column(name = "reason")
    private String reason;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "restock", nullable = false)
    private Boolean restock = true;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "cashier_name")
    private String cashierName;

    @Column(name = "business_date")
    private java.time.LocalDate businessDate;

    public PosSaleReturn() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getReturnNumber() { return returnNumber; }
    public void setReturnNumber(String returnNumber) { this.returnNumber = returnNumber; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getTransactionNumber() { return transactionNumber; }
    public void setTransactionNumber(String transactionNumber) { this.transactionNumber = transactionNumber; }

    public Long getPosSessionId() { return posSessionId; }
    public void setPosSessionId(Long posSessionId) { this.posSessionId = posSessionId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getTotalCogs() { return totalCogs; }
    public void setTotalCogs(BigDecimal totalCogs) { this.totalCogs = totalCogs; }

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }

    public java.util.List<com.company.project.dto.PaymentSplitDTO> getRefundBreakdown() { return refundBreakdown; }
    public void setRefundBreakdown(java.util.List<com.company.project.dto.PaymentSplitDTO> refundBreakdown) { this.refundBreakdown = refundBreakdown; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Boolean getRestock() { return restock; }
    public void setRestock(Boolean restock) { this.restock = restock; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getCashierName() { return cashierName; }
    public void setCashierName(String cashierName) { this.cashierName = cashierName; }

    public java.time.LocalDate getBusinessDate() { return businessDate; }
    public void setBusinessDate(java.time.LocalDate businessDate) { this.businessDate = businessDate; }
}
