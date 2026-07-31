package com.company.project.dto;

import com.company.project.entities.FinancialSetting;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.time.LocalDateTime;

public class FinancialSettingResponseDTO {

    private Long id;
    private String settingKey;
    private String settingValue;
    private String category;
    private String description;
    private Boolean isActive;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    public FinancialSettingResponseDTO() {}

    public static FinancialSettingResponseDTO fromEntity(FinancialSetting s) {
        FinancialSettingResponseDTO dto = new FinancialSettingResponseDTO();
        dto.setId(s.getId());
        dto.setSettingKey(s.getSettingKey());
        dto.setSettingValue(s.getSettingValue());
        dto.setCategory(s.getCategory());
        dto.setDescription(s.getDescription());
        dto.setIsActive(s.getIsActive());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }

    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
