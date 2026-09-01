package com.company.project.entities;

import com.company.project.converters.MinorChargeBreakdownConverter;
import com.company.project.converters.PaymentBreakdownConverter;
import com.company.project.dto.MinorChargeDTO;
import com.company.project.dto.PaymentSplitDTO;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "receipts")
public class Receipt extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // auto-generated: RCPT-XXXXXXXXXX
    @Column(name = "receipt_no", unique = true)
    private String receiptNo;

    // auto-generated: INV-{year}-{00001}, via VoucherNumberService. Stamped only on
    // bill rows (New/Renewal/Add-on/Daily Entry/minor charge) at creation — null on
    // settlement/"Payment" rows, which are receipts for a payment, not invoices.
    @Column(name = "invoice_no")
    private String invoiceNo;

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

    // Itemized minor family members' fees folded into this receipt when it belongs
    // to their guardian, e.g. [{name:"Alex Doe", amount:50}]. Empty/null otherwise.
    @Column(name = "minor_charges", columnDefinition = "TEXT")
    @Convert(converter = MinorChargeBreakdownConverter.class)
    private List<MinorChargeDTO> minorCharges;

    // Cumulative amount paid toward THIS bill across its whole lifecycle (this
    // receipt's own paidAmount plus every later settlement applied against it).
    // A live rollup — unlike paidAmount/paymentMethod/paymentBreakdown (which stay
    // frozen as the immutable record of what this specific transaction received),
    // this field is allowed to keep advancing as later settlements pay the bill
    // down further, exactly like Member.outstandingBalance. Null on settlement/
    // "Payment" rows, which aren't themselves payable bills.
    @Column(name = "total_paid_to_date", precision = 10, scale = 2)
    private BigDecimal totalPaidToDate;

    // Snapshot of the member's overall outstanding balance immediately after this
    // transaction posted — captured once at creation and never touched again, so
    // every receipt/payment row carries its own immutable "remaining due after
    // this payment" fact for the receipt list and audit trail.
    @Column(name = "balance_after", precision = 10, scale = 2)
    private BigDecimal balanceAfter;

    // When this row is itself a settlement/"Payment" transaction, the bill
    // (Receipt.id) it paid down — lets consumers attribute it precisely instead
    // of guessing from transaction dates. Null for bill rows, and for a
    // settlement that legitimately spans more than one bill in a single
    // checkout (rare in practice for this app's usage).
    @Column(name = "linked_bill_id")
    private Long linkedBillId;

    @Column(name = "invoice_id")
    private Long invoiceId;

    public Receipt() {}

    // ── Getters & Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReceiptNo() { return receiptNo; }
    public void setReceiptNo(String receiptNo) { this.receiptNo = receiptNo; }

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

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

    public List<MinorChargeDTO> getMinorCharges() { return minorCharges; }
    public void setMinorCharges(List<MinorChargeDTO> minorCharges) { this.minorCharges = minorCharges; }

    public BigDecimal getTotalPaidToDate() { return totalPaidToDate; }
    public void setTotalPaidToDate(BigDecimal totalPaidToDate) { this.totalPaidToDate = totalPaidToDate; }

    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }

    public Long getLinkedBillId() { return linkedBillId; }
    public void setLinkedBillId(Long linkedBillId) { this.linkedBillId = linkedBillId; }

    public Long getInvoiceId() { return invoiceId; }
    public void setInvoiceId(Long invoiceId) { this.invoiceId = invoiceId; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
