package com.company.project.dto;

import com.company.project.entities.RewardAuditLog;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

public class RewardAuditLogResponseDTO {

    private Long id;
    private Long rewardId;
    private String action;
    private String performedBy;
    private String remarks;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    public static RewardAuditLogResponseDTO fromEntity(RewardAuditLog log) {
        RewardAuditLogResponseDTO dto = new RewardAuditLogResponseDTO();
        dto.id = log.getId();
        dto.rewardId = log.getRewardId();
        dto.action = log.getAction() != null ? log.getAction().name() : null;
        dto.performedBy = log.getPerformedBy();
        dto.remarks = log.getRemarks();
        dto.createdAt = log.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRewardId() { return rewardId; }
    public void setRewardId(Long rewardId) { this.rewardId = rewardId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
