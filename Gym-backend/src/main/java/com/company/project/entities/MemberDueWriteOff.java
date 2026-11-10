package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One member bill written off as uncollectable (Billing › Pending Payments). Permanent history:
 * member and bill details are copied in, so the row survives renames, archiving and deletion.
 * A write-off is not a payment and never appears in collections or revenue.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "member_due_write_offs")
public class MemberDueWriteOff extends BaseEntity implements BranchAware {

    public static final java.util.Set<String> REASONS = java.util.Set.of(
            "UNCOLLECTABLE", "DISCONTINUED", "MANAGEMENT_DECISION", "OLD_BALANCE", "OTHER");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "receipt_id", nullable = false, unique = true)
    private Long receiptId;

    @Column(name = "receipt_no")
    private String receiptNo;

    @Column(name = "invoice_no")
    private String invoiceNo;

    @Column(name = "member_db_id")
    private Long memberDbId;

    @Column(name = "member_code")
    private String memberCode;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "member_phone")
    private String memberPhone;

    @Column(name = "bill_description", length = 500)
    private String billDescription;

    @Column(name = "bill_date")
    private LocalDateTime billDate;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "original_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal originalAmount;

    @Column(name = "paid_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal paidAmount;

    @Column(name = "written_off_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal writtenOffAmount;

    @Column(name = "reason", length = 40, nullable = false)
    private String reason;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "written_off_by", nullable = false)
    private String writtenOffBy;

    @Column(name = "written_off_at", nullable = false)
    private LocalDateTime writtenOffAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

    public String getReceiptNo() { return receiptNo; }
    public void setReceiptNo(String receiptNo) { this.receiptNo = receiptNo; }

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberCode() { return memberCode; }
    public void setMemberCode(String memberCode) { this.memberCode = memberCode; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMemberPhone() { return memberPhone; }
    public void setMemberPhone(String memberPhone) { this.memberPhone = memberPhone; }

    public String getBillDescription() { return billDescription; }
    public void setBillDescription(String billDescription) { this.billDescription = billDescription; }

    public LocalDateTime getBillDate() { return billDate; }
    public void setBillDate(LocalDateTime billDate) { this.billDate = billDate; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

    public BigDecimal getOriginalAmount() { return originalAmount; }
    public void setOriginalAmount(BigDecimal originalAmount) { this.originalAmount = originalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getWrittenOffAmount() { return writtenOffAmount; }
    public void setWrittenOffAmount(BigDecimal writtenOffAmount) { this.writtenOffAmount = writtenOffAmount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getWrittenOffBy() { return writtenOffBy; }
    public void setWrittenOffBy(String writtenOffBy) { this.writtenOffBy = writtenOffBy; }

    public LocalDateTime getWrittenOffAt() { return writtenOffAt; }
    public void setWrittenOffAt(LocalDateTime writtenOffAt) { this.writtenOffAt = writtenOffAt; }
}
