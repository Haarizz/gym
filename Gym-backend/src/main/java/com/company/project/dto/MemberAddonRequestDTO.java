package com.company.project.dto;

import java.math.BigDecimal;

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
}
