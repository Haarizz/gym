package com.company.project.dto;

import com.company.project.entities.ReferralCampaign;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ReferralCampaignResponseDTO {

    private Long id;
    private String campaignId;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Integer priority;
    private Boolean stackable;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    public static ReferralCampaignResponseDTO fromEntity(ReferralCampaign c) {
        ReferralCampaignResponseDTO dto = new ReferralCampaignResponseDTO();
        dto.id = c.getId();
        dto.campaignId = c.getCampaignId();
        dto.name = c.getName();
        dto.description = c.getDescription();
        dto.startDate = c.getStartDate();
        dto.endDate = c.getEndDate();
        dto.status = c.getStatus();
        dto.priority = c.getPriority();
        dto.stackable = c.getStackable();
        dto.createdAt = c.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public Boolean getStackable() { return stackable; }
    public void setStackable(Boolean stackable) { this.stackable = stackable; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
