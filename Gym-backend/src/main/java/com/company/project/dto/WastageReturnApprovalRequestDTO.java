package com.company.project.dto;

public class WastageReturnApprovalRequestDTO {

    private String action; // APPROVE | REJECT
    private String rejectionReason;

    public WastageReturnApprovalRequestDTO() {}

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
}
