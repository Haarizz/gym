package com.company.project.dto;

import com.company.project.entities.PrintTemplate;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

/** Request and response body for /api/print-templates. */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class PrintTemplateDTO {

    private Long id;
    private String category;
    private String name;
    private Boolean isDefault;
    private String paperSize;
    private String settings;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;
    private String updatedBy;

    public PrintTemplateDTO() {}

    public static PrintTemplateDTO fromEntity(PrintTemplate t) {
        PrintTemplateDTO dto = new PrintTemplateDTO();
        dto.setId(t.getId());
        dto.setCategory(t.getCategory());
        dto.setName(t.getName());
        dto.setIsDefault(t.getIsDefault());
        dto.setPaperSize(t.getPaperSize());
        dto.setSettings(t.getSettings());
        dto.setCreatedAt(t.getCreatedAt());
        dto.setUpdatedAt(t.getUpdatedAt());
        dto.setUpdatedBy(t.getUpdatedBy() != null ? t.getUpdatedBy() : t.getCreatedBy());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }

    public String getPaperSize() { return paperSize; }
    public void setPaperSize(String paperSize) { this.paperSize = paperSize; }

    public String getSettings() { return settings; }
    public void setSettings(String settings) { this.settings = settings; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
