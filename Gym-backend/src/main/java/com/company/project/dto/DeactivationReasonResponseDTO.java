package com.company.project.dto;

import com.company.project.entities.DeactivationReason;

public class DeactivationReasonResponseDTO {

    private Long id;
    private String reason;
    private boolean active;
    private int sortOrder;

    public static DeactivationReasonResponseDTO fromEntity(DeactivationReason r) {
        DeactivationReasonResponseDTO dto = new DeactivationReasonResponseDTO();
        dto.id = r.getId();
        dto.reason = r.getReason();
        dto.active = r.isActive();
        dto.sortOrder = r.getSortOrder();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
