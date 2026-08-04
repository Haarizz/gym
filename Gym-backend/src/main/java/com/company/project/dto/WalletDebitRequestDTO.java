package com.company.project.dto;

import java.math.BigDecimal;

// Used by checkout screens (add-member, renew-upgrade, member-addons) when the
// staff applies the "Use Wallet" checkbox against a bill.
public class WalletDebitRequestDTO {

    private BigDecimal amount;
    private String sourceType; // e.g. "BILLING_USE"
    private Long sourceId;     // e.g. the Receipt/MemberAddon id
    private String remarks;

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }

    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
