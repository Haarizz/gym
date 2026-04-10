package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "journal_vouchers")
public class JournalVoucher extends BaseEntity {

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

    @Column(name = "reference")
    private String reference;

    @Column(name = "total_debit", precision = 12, scale = 2)
    private BigDecimal totalDebit;

    @Column(name = "total_credit", precision = 12, scale = 2)
    private BigDecimal totalCredit;

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

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public BigDecimal getTotalDebit() { return totalDebit; }
    public void setTotalDebit(BigDecimal totalDebit) { this.totalDebit = totalDebit; }

    public BigDecimal getTotalCredit() { return totalCredit; }
    public void setTotalCredit(BigDecimal totalCredit) { this.totalCredit = totalCredit; }

    public boolean isSystemGenerated() { return systemGenerated; }
    public void setSystemGenerated(boolean systemGenerated) { this.systemGenerated = systemGenerated; }

    public Long getReversesVoucherId() { return reversesVoucherId; }
    public void setReversesVoucherId(Long reversesVoucherId) { this.reversesVoucherId = reversesVoucherId; }

    public Long getReversedByVoucherId() { return reversedByVoucherId; }
    public void setReversedByVoucherId(Long reversedByVoucherId) { this.reversedByVoucherId = reversedByVoucherId; }
}
