package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for creating a MemberAddon.
 * Jackson deserializes snake_case JSON fields to camelCase Java fields
 * via the global SNAKE_CASE strategy.
 */
public class MemberAddonRequestDTO {

    private Long memberDbId;
    private String memberId;
    private String memberName;
    private String addonName;
    private String addonDescription;
    private String category;
    private BigDecimal amount;
    private String paymentMode;
    private String startDate;    // ISO date-time string, e.g. "2024-01-01T00:00:00Z"
    private String expiryDate;   // ISO date-time string
    private String notes;
    // Method-specific detail (card type, cheque number, online payment type, ...)
    // for the payment mode above — single entry, no Mixed support on this module.
    private List<PaymentSplitDTO> paymentBreakdown;
    // Only meaningful when the target member is billed to a family head (any
    // minor, or a billed_to_head adult): how much is actually being collected
    // now, out of `amount` — the remainder becomes a due on the guardian's
    // account instead of the member's own. Ignored for a member who carries
    // their own balance (that path is always treated as fully paid).
    private BigDecimal paidAmount;
    // How much of `amount` is being covered by the member's reward wallet
    // balance, if any. Debited from the wallet in the same transaction as the
    // add-on itself, so the wallet balance and the ledger's Reward Wallet
    // Liability account can never drift apart (see WalletService.debit).
    private BigDecimal walletAmountApplied;
    // Which staff member actually handled this sale — see MemberRequestDTO.processedByStaffId.
    private Long processedByStaffId;

    public MemberAddonRequestDTO() {}

    // ── Getters & Setters ────────────────────────────────────────────────────

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getAddonName() { return addonName; }
    public void setAddonName(String addonName) { this.addonName = addonName; }

    public String getAddonDescription() { return addonDescription; }
    public void setAddonDescription(String addonDescription) { this.addonDescription = addonDescription; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getWalletAmountApplied() { return walletAmountApplied; }
    public void setWalletAmountApplied(BigDecimal walletAmountApplied) { this.walletAmountApplied = walletAmountApplied; }

    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }
}
