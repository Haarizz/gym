package com.company.project.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class MessageHistoryDTO {
    private String id;
    private String subject;
    private String content;
    private String type;
    private String status;
    private Integer recipientCount;
    private List<String> recipients = new ArrayList<>();
    private LocalDateTime sentDate;
    private LocalDateTime scheduledDate;
    private Double deliveryRate;
    private Double openRate;
    private Double clickRate;
    private String sentBy;
    private Double cost;

    public MessageHistoryDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getRecipientCount() { return recipientCount; }
    public void setRecipientCount(Integer recipientCount) { this.recipientCount = recipientCount; }

    public List<String> getRecipients() { return recipients; }
    public void setRecipients(List<String> recipients) { this.recipients = recipients; }

    public LocalDateTime getSentDate() { return sentDate; }
    public void setSentDate(LocalDateTime sentDate) { this.sentDate = sentDate; }

    public LocalDateTime getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDateTime scheduledDate) { this.scheduledDate = scheduledDate; }

    public Double getDeliveryRate() { return deliveryRate; }
    public void setDeliveryRate(Double deliveryRate) { this.deliveryRate = deliveryRate; }

    public Double getOpenRate() { return openRate; }
    public void setOpenRate(Double openRate) { this.openRate = openRate; }

    public Double getClickRate() { return clickRate; }
    public void setClickRate(Double clickRate) { this.clickRate = clickRate; }

    public String getSentBy() { return sentBy; }
    public void setSentBy(String sentBy) { this.sentBy = sentBy; }

    public Double getCost() { return cost; }
    public void setCost(Double cost) { this.cost = cost; }
}
