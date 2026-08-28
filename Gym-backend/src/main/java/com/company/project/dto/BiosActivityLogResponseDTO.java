package com.company.project.dto;

import com.company.project.entities.BiosActivityLog;

public class BiosActivityLogResponseDTO {
    private String id;
    private String type;
    private String title;
    private String format;
    private Integer rowCount;
    private String generatedBy;
    private String createdAt;

    public static BiosActivityLogResponseDTO fromEntity(BiosActivityLog log) {
        BiosActivityLogResponseDTO dto = new BiosActivityLogResponseDTO();
        dto.id = String.valueOf(log.getId());
        dto.type = log.getType();
        dto.title = log.getTitle();
        dto.format = log.getFormat();
        dto.rowCount = log.getRowCount();
        dto.generatedBy = log.getCreatedBy();
        dto.createdAt = log.getCreatedAt() != null ? log.getCreatedAt().toString() : null;
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
    public Integer getRowCount() { return rowCount; }
    public void setRowCount(Integer rowCount) { this.rowCount = rowCount; }
    public String getGeneratedBy() { return generatedBy; }
    public void setGeneratedBy(String generatedBy) { this.generatedBy = generatedBy; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
