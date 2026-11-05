package com.company.project.dto;

import java.math.BigDecimal;

/**
 * One add-on or facility-access line on a membership receipt (New Member Registration sells
 * them on the membership's own receipt). Stored as JSON in receipts.addon_items.
 * {@code amount} is the line's full price; {@code cancelled} is set when that add-on alone is
 * cancelled later (its share is refunded / written off, the rest of the receipt stands).
 */
public class ReceiptAddonItemDTO {
    private Long memberAddonId;
    private String name;
    private String category;
    private BigDecimal amount;
    private String validFrom;   // yyyy-MM-dd
    private String validTill;   // yyyy-MM-dd
    private Boolean cancelled;

    public ReceiptAddonItemDTO() {}

    public ReceiptAddonItemDTO(Long memberAddonId, String name, String category, BigDecimal amount,
                               String validFrom, String validTill) {
        this.memberAddonId = memberAddonId;
        this.name = name;
        this.category = category;
        this.amount = amount;
        this.validFrom = validFrom;
        this.validTill = validTill;
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public boolean isActiveLine() { return !Boolean.TRUE.equals(cancelled); }

    public Long getMemberAddonId() { return memberAddonId; }
    public void setMemberAddonId(Long memberAddonId) { this.memberAddonId = memberAddonId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getValidFrom() { return validFrom; }
    public void setValidFrom(String validFrom) { this.validFrom = validFrom; }
    public String getValidTill() { return validTill; }
    public void setValidTill(String validTill) { this.validTill = validTill; }
    public Boolean getCancelled() { return cancelled; }
    public void setCancelled(Boolean cancelled) { this.cancelled = cancelled; }
}
