package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Result of a committed outstanding-balance settlement (cached for idempotent replays). */
public class MobileOutstandingBalanceSettleResponseDTO {

    private Long membershipId;
    private Long receiptId;
    private String receiptNo;
    private BigDecimal amountPaid;
    // Member.outstandingBalance after this settlement.
    private BigDecimal outstandingAmount;
    private LocalDateTime settledAt;

    public Long getMembershipId() { return membershipId; }
    public void setMembershipId(Long membershipId) { this.membershipId = membershipId; }

    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

    public String getReceiptNo() { return receiptNo; }
    public void setReceiptNo(String receiptNo) { this.receiptNo = receiptNo; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public BigDecimal getOutstandingAmount() { return outstandingAmount; }
    public void setOutstandingAmount(BigDecimal outstandingAmount) { this.outstandingAmount = outstandingAmount; }

    public LocalDateTime getSettledAt() { return settledAt; }
    public void setSettledAt(LocalDateTime settledAt) { this.settledAt = settledAt; }
}
