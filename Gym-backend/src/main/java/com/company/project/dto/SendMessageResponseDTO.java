package com.company.project.dto;

public class SendMessageResponseDTO {
    private String campaignId;
    private String status;
    private Integer recipientCount;

    public SendMessageResponseDTO() {}

    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getRecipientCount() { return recipientCount; }
    public void setRecipientCount(Integer recipientCount) { this.recipientCount = recipientCount; }
}
