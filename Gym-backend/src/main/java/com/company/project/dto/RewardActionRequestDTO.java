package com.company.project.dto;

// Optional body for approve/reject/cancel actions on a reward.
public class RewardActionRequestDTO {

    private String remarks;

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
