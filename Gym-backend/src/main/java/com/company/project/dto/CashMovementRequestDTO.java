package com.company.project.dto;

import java.math.BigDecimal;

public class CashMovementRequestDTO {

    private String type;
    private BigDecimal amount;
    private String reason;

    public CashMovementRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
