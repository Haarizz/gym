package com.company.project.dto;

import com.company.project.entities.FinancialAuditLog;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.time.LocalDateTime;

public class FinancialAuditLogResponseDTO {

    private Long id;
    private String action;
    private String entityType;
    private Long entityId;
    private String voucherNo;
    private String module;
    private String performedBy;
    private String ipAddress;
    private String summary;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    public FinancialAuditLogResponseDTO() {}

    public static FinancialAuditLogResponseDTO fromEntity(FinancialAuditLog l) {
        FinancialAuditLogResponseDTO dto = new FinancialAuditLogResponseDTO();
        dto.setId(l.getId());
        dto.setAction(l.getAction());
        dto.setEntityType(l.getEntityType());
        dto.setEntityId(l.getEntityId());
        dto.setVoucherNo(l.getVoucherNo());
        dto.setModule(l.getModule());
        dto.setPerformedBy(l.getPerformedBy());
        dto.setIpAddress(l.getIpAddress());
        dto.setSummary(l.getSummary());
        dto.setCreatedAt(l.getCreatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
