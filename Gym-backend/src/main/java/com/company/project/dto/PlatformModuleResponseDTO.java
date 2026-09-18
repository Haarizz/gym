package com.company.project.dto;

import java.time.LocalDateTime;

public class PlatformModuleResponseDTO {

    private Long id;
    private String moduleKey;
    private String displayName;
    private String status;
    private boolean enabled;
    private LocalDateTime lastStatusChangeAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getModuleKey() { return moduleKey; }
    public void setModuleKey(String moduleKey) { this.moduleKey = moduleKey; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public LocalDateTime getLastStatusChangeAt() { return lastStatusChangeAt; }
    public void setLastStatusChangeAt(LocalDateTime lastStatusChangeAt) { this.lastStatusChangeAt = lastStatusChangeAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
