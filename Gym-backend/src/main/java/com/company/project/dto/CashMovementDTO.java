package com.company.project.dto;

import com.company.project.entities.CashMovement;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CashMovementDTO {

    private Long id;
    private Long posSessionId;
    private String type;
    private BigDecimal amount;
    private String reason;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    public CashMovementDTO() {}

    public static CashMovementDTO fromEntity(CashMovement m) {
        CashMovementDTO dto = new CashMovementDTO();
        dto.setId(m.getId());
        dto.setPosSessionId(m.getPosSessionId());
        dto.setType(m.getType());
        dto.setAmount(m.getAmount());
        dto.setReason(m.getReason());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPosSessionId() { return posSessionId; }
    public void setPosSessionId(Long posSessionId) { this.posSessionId = posSessionId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
