package com.company.project.entities;

import com.company.project.converters.PaymentBreakdownConverter;
import com.company.project.dto.PaymentSplitDTO;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.util.List;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "sale_transactions")
public class SaleTransaction extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_number", unique = true)
    private String transactionNumber;

    @Column(name = "pos_session_id")
    private Long posSessionId;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "subtotal", precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 10, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "total_cogs", precision = 10, scale = 2)
    private BigDecimal totalCogs = BigDecimal.ZERO;

    @Column(name = "received_amount", precision = 10, scale = 2)
    private BigDecimal receivedAmount;

    @Column(name = "change_amount", precision = 10, scale = 2)
    private BigDecimal changeAmount;

    @Column(name = "status")
    private String status = "COMPLETED";

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Per-leg breakdown when paymentMethod == "Mixed"
    @Column(name = "payment_breakdown", columnDefinition = "TEXT")
    @Convert(converter = PaymentBreakdownConverter.class)
    private List<PaymentSplitDTO> paymentBreakdown;

    @Column(name = "bill_discount_type", length = 10)
    private String billDiscountType;

    @Column(name = "bill_discount_value", precision = 12, scale = 2)
    private BigDecimal billDiscountValue;

    @Column(name = "bill_discount_amount", precision = 12, scale = 2)
    private BigDecimal billDiscountAmount = BigDecimal.ZERO;

    @Column(name = "line_discount_amount", precision = 12, scale = 2)
    private BigDecimal lineDiscountAmount = BigDecimal.ZERO;

    @Column(name = "taxable_amount", precision = 12, scale = 2)
    private BigDecimal taxableAmount;

    @Column(name = "tax_inclusive")
    private Boolean taxInclusive = false;

    @Column(name = "credit_amount", precision = 12, scale = 2)
    private BigDecimal creditAmount = BigDecimal.ZERO;

    @Column(name = "credit_settled_amount", precision = 12, scale = 2)
    private BigDecimal creditSettledAmount = BigDecimal.ZERO;

    @Column(name = "refunded_amount", precision = 12, scale = 2)
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    @Column(name = "return_status", length = 20)
    private String returnStatus = "NONE";

    @Column(name = "payment_allocations", columnDefinition = "TEXT")
    private String paymentAllocations;

    @Column(name = "payment_summary")
    private String paymentSummary;

    @Column(name = "cashier_name")
    private String cashierName;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    @Column(name = "business_date")
    private java.time.LocalDate businessDate;

    @Column(name = "reprint_count")
    private Integer reprintCount = 0;

    @Column(name = "member_code", length = 100)
    private String memberCode;

    @Column(name = "member_phone", length = 50)
    private String memberPhone;

    @Column(name = "approved_by")
    private String approvedBy;

    /** Promotion or referral-coupon code applied at the till (V77). */
    @Column(name = "discount_code", length = 60)
    private String discountCode;

    /** Discount given by the code / promotion, on top of the cashier's bill discount. */
    @Column(name = "code_discount_amount", precision = 12, scale = 2)
    private BigDecimal codeDiscountAmount;

    @Column(name = "promotion_id")
    private Long promotionId;

    @Column(name = "promotion_name", length = 200)
    private String promotionName;

    public SaleTransaction() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTransactionNumber() { return transactionNumber; }
    public void setTransactionNumber(String transactionNumber) { this.transactionNumber = transactionNumber; }

    public Long getPosSessionId() { return posSessionId; }
    public void setPosSessionId(Long posSessionId) { this.posSessionId = posSessionId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

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

    public BigDecimal getReceivedAmount() { return receivedAmount; }
    public void setReceivedAmount(BigDecimal receivedAmount) { this.receivedAmount = receivedAmount; }

    public BigDecimal getChangeAmount() { return changeAmount; }
    public void setChangeAmount(BigDecimal changeAmount) { this.changeAmount = changeAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBillDiscountType() { return billDiscountType; }
    public void setBillDiscountType(String billDiscountType) { this.billDiscountType = billDiscountType; }

    public BigDecimal getBillDiscountValue() { return billDiscountValue; }
    public void setBillDiscountValue(BigDecimal billDiscountValue) { this.billDiscountValue = billDiscountValue; }

    public BigDecimal getBillDiscountAmount() { return billDiscountAmount; }
    public void setBillDiscountAmount(BigDecimal billDiscountAmount) { this.billDiscountAmount = billDiscountAmount; }

    public BigDecimal getLineDiscountAmount() { return lineDiscountAmount; }
    public void setLineDiscountAmount(BigDecimal lineDiscountAmount) { this.lineDiscountAmount = lineDiscountAmount; }

    public BigDecimal getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(BigDecimal taxableAmount) { this.taxableAmount = taxableAmount; }

    public Boolean getTaxInclusive() { return taxInclusive; }
    public void setTaxInclusive(Boolean taxInclusive) { this.taxInclusive = taxInclusive; }

    public BigDecimal getCreditAmount() { return creditAmount; }
    public void setCreditAmount(BigDecimal creditAmount) { this.creditAmount = creditAmount; }

    public BigDecimal getCreditSettledAmount() { return creditSettledAmount; }
    public void setCreditSettledAmount(BigDecimal creditSettledAmount) { this.creditSettledAmount = creditSettledAmount; }

    public BigDecimal getRefundedAmount() { return refundedAmount; }
    public void setRefundedAmount(BigDecimal refundedAmount) { this.refundedAmount = refundedAmount; }

    public String getReturnStatus() { return returnStatus; }
    public void setReturnStatus(String returnStatus) { this.returnStatus = returnStatus; }

    public String getPaymentAllocations() { return paymentAllocations; }
    public void setPaymentAllocations(String paymentAllocations) { this.paymentAllocations = paymentAllocations; }

    public String getPaymentSummary() { return paymentSummary; }
    public void setPaymentSummary(String paymentSummary) { this.paymentSummary = paymentSummary; }

    public String getCashierName() { return cashierName; }
    public void setCashierName(String cashierName) { this.cashierName = cashierName; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }

    public java.time.LocalDate getBusinessDate() { return businessDate; }
    public void setBusinessDate(java.time.LocalDate businessDate) { this.businessDate = businessDate; }

    public Integer getReprintCount() { return reprintCount; }
    public void setReprintCount(Integer reprintCount) { this.reprintCount = reprintCount; }

    public String getMemberCode() { return memberCode; }
    public void setMemberCode(String memberCode) { this.memberCode = memberCode; }

    public String getMemberPhone() { return memberPhone; }
    public void setMemberPhone(String memberPhone) { this.memberPhone = memberPhone; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }
    public String getDiscountCode() { return discountCode; }
    public void setDiscountCode(String discountCode) { this.discountCode = discountCode; }
    public BigDecimal getCodeDiscountAmount() { return codeDiscountAmount; }
    public void setCodeDiscountAmount(BigDecimal codeDiscountAmount) { this.codeDiscountAmount = codeDiscountAmount; }
    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }
    public String getPromotionName() { return promotionName; }
    public void setPromotionName(String promotionName) { this.promotionName = promotionName; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
