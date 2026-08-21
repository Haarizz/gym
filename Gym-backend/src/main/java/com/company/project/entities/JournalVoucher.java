package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "journal_vouchers")
public class JournalVoucher extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_no", unique = true, nullable = false)
    private String voucherNo;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "narration", columnDefinition = "TEXT")
    private String narration;

    @Column(name = "status")
    private String status;

    @Column(name = "approval_status")
    private String approvalStatus = "APPROVED"; // Auto-generated are APPROVED by default, manual are PENDING

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "reference")
    private String reference;

    @Column(name = "total_debit", precision = 12, scale = 2)
    private BigDecimal totalDebit;

    @Column(name = "total_credit", precision = 12, scale = 2)
    private BigDecimal totalCredit;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "exchange_rate", precision = 12, scale = 6)
    private BigDecimal exchangeRate = BigDecimal.ONE;

    /**
     * True when this voucher was created automatically by FinancialEventService
     * in response to a business event (payment, salary, sale, etc.).
     * False for manually entered journal vouchers.
     */
    @Column(name = "is_system_generated", nullable = false, columnDefinition = "boolean not null default false")
    private boolean systemGenerated = false;

    /**
     * If this voucher is a reversal, this field holds the ID of the original
     * POSTED voucher that was reversed. NULL for non-reversal vouchers.
     */
    @Column(name = "reverses_voucher_id")
    private Long reversesVoucherId;

    /**
     * If this voucher has been reversed, this field holds the ID of the
     * reversal voucher. NULL until a reversal is created.
     */
    @Column(name = "reversed_by_voucher_id")
    private Long reversedByVoucherId;

    /**
     * Soft-delete marker — set when an accountant deletes a DRAFT/CANCELLED voucher.
     * The row (and its lines) are never actually removed, so the audit trail is
     * preserved; deleted vouchers are simply excluded from normal list/get queries.
     * NULL means not deleted.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public JournalVoucher() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public BigDecimal getTotalDebit() { return totalDebit; }
    public void setTotalDebit(BigDecimal totalDebit) { this.totalDebit = totalDebit; }

    public BigDecimal getTotalCredit() { return totalCredit; }
    public void setTotalCredit(BigDecimal totalCredit) { this.totalCredit = totalCredit; }

    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }

    public BigDecimal getExchangeRate() { return exchangeRate; }
    public void setExchangeRate(BigDecimal exchangeRate) { this.exchangeRate = exchangeRate; }

    public boolean isSystemGenerated() { return systemGenerated; }
    public void setSystemGenerated(boolean systemGenerated) { this.systemGenerated = systemGenerated; }

    public Long getReversesVoucherId() { return reversesVoucherId; }
    public void setReversesVoucherId(Long reversesVoucherId) { this.reversesVoucherId = reversesVoucherId; }

    public Long getReversedByVoucherId() { return reversedByVoucherId; }
    public void setReversedByVoucherId(Long reversedByVoucherId) { this.reversedByVoucherId = reversedByVoucherId; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }

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
