package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Cash <-> Bank transfer (deposit, withdrawal, inter-account transfer) — the
 * one money movement that isn't a revenue/expense event and previously had no
 * dedicated voucher type, forcing accountants through a manual Journal Voucher.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "contra_vouchers")
public class ContraVoucher extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_no", unique = true, nullable = false)
    private String voucherNo;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "from_account_code", nullable = false)
    private String fromAccountCode;

    @Column(name = "from_account_name")
    private String fromAccountName;

    @Column(name = "to_account_code", nullable = false)
    private String toAccountCode;

    @Column(name = "to_account_name")
    private String toAccountName;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "narration", columnDefinition = "TEXT")
    private String narration;

    @Column(name = "reference")
    private String reference;

    // DRAFT | POSTED | CANCELLED
    @Column(name = "status", nullable = false)
    private String status = "DRAFT";

    public ContraVoucher() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getFromAccountCode() { return fromAccountCode; }
    public void setFromAccountCode(String fromAccountCode) { this.fromAccountCode = fromAccountCode; }

    public String getFromAccountName() { return fromAccountName; }
    public void setFromAccountName(String fromAccountName) { this.fromAccountName = fromAccountName; }

    public String getToAccountCode() { return toAccountCode; }
    public void setToAccountCode(String toAccountCode) { this.toAccountCode = toAccountCode; }

    public String getToAccountName() { return toAccountName; }
    public void setToAccountName(String toAccountName) { this.toAccountName = toAccountName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
