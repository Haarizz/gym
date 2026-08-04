package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

// Ledger row for a member's reward wallet. Member.walletBalance is the cached
// running total; this table is the detailed, append-only history behind it —
// mirrors how Receipt is the detailed record behind Member.outstandingBalance.
@Entity
@Table(name = "wallet_transactions")
public class WalletTransaction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private String memberId;

    // CREDIT / DEBIT
    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "balance_after", precision = 12, scale = 2)
    private BigDecimal balanceAfter;

    // e.g. REFERRAL_REWARD, BILLING_USE, ADMIN_ADJUSTMENT
    @Column(name = "source_type")
    private String sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    public WalletTransaction() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }

    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
