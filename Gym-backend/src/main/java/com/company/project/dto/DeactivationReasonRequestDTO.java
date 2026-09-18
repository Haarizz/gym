package com.company.project.dto;

public class DeactivationReasonRequestDTO {

    private String reason;
    private Boolean active;
    private Integer sortOrder;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
