package com.company.project.dto;

import com.company.project.entities.Integration;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class IntegrationResponseDTO {

    private Long id;
    private String integrationKey;
    private String name;
    private String category;
    private String status;
    private BigDecimal successRate;
    private LocalDateTime lastSyncAt;
    private String notes;

    public static IntegrationResponseDTO fromEntity(Integration integration) {
        IntegrationResponseDTO dto = new IntegrationResponseDTO();
        dto.id = integration.getId();
        dto.integrationKey = integration.getIntegrationKey();
        dto.name = integration.getName();
        dto.category = integration.getCategory();
        dto.status = integration.getStatus();
        dto.successRate = integration.getSuccessRate();
        dto.lastSyncAt = integration.getLastSyncAt();
        dto.notes = integration.getNotes();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIntegrationKey() { return integrationKey; }
    public void setIntegrationKey(String integrationKey) { this.integrationKey = integrationKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getSuccessRate() { return successRate; }
    public void setSuccessRate(BigDecimal successRate) { this.successRate = successRate; }

    public LocalDateTime getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(LocalDateTime lastSyncAt) { this.lastSyncAt = lastSyncAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
