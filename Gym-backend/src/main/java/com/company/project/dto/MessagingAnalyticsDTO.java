package com.company.project.dto;

public class MessagingAnalyticsDTO {
    private Integer sentToday;
    private Integer scheduledMessages;
    private Integer totalRecipients;
    private Double openRate;
    private Double clickRate;
    private Double totalCost;

    public MessagingAnalyticsDTO() {}

    public Integer getSentToday() { return sentToday; }
    public void setSentToday(Integer sentToday) { this.sentToday = sentToday; }

    public Integer getScheduledMessages() { return scheduledMessages; }
    public void setScheduledMessages(Integer scheduledMessages) { this.scheduledMessages = scheduledMessages; }

    public Integer getTotalRecipients() { return totalRecipients; }
    public void setTotalRecipients(Integer totalRecipients) { this.totalRecipients = totalRecipients; }

    public Double getOpenRate() { return openRate; }
    public void setOpenRate(Double openRate) { this.openRate = openRate; }

    public Double getClickRate() { return clickRate; }
    public void setClickRate(Double clickRate) { this.clickRate = clickRate; }

    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }
}
