package com.company.project.dto;

import com.company.project.entities.ModuleAuditLog;

import java.time.LocalDateTime;

public class ModuleAuditLogResponseDTO {

    private Long id;
    private String action;
    private String moduleKey;
    private String performedBy;
    private String ipAddress;
    private String summary;
    private LocalDateTime createdAt;

    public static ModuleAuditLogResponseDTO fromEntity(ModuleAuditLog log) {
        ModuleAuditLogResponseDTO dto = new ModuleAuditLogResponseDTO();
        dto.id = log.getId();
        dto.action = log.getAction();
        dto.moduleKey = log.getModuleKey();
        dto.performedBy = log.getPerformedBy();
        dto.ipAddress = log.getIpAddress();
        dto.summary = log.getSummary();
        dto.createdAt = log.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getModuleKey() { return moduleKey; }
    public void setModuleKey(String moduleKey) { this.moduleKey = moduleKey; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
