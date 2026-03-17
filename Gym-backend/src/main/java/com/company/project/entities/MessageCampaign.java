package com.company.project.entities;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_campaigns")
public class MessageCampaign extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** sms | whatsapp | email | in-app */
    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /** scheduled | sending | sent | failed | partial */
    @Column(nullable = false)
    private String status = "scheduled";

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "recipient_count")
    private Integer recipientCount = 0;

    @Column(name = "delivered_count")
    private Integer deliveredCount = 0;

    @Column(name = "failed_count")
    private Integer failedCount = 0;

    @Column(name = "open_rate")
    private Double openRate = 0.0;

    @Column(name = "click_rate")
    private Double clickRate = 0.0;

    @Column(name = "cost", precision = 10, scale = 2)
    private BigDecimal cost = BigDecimal.ZERO;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "personalization")
    private boolean personalization = true;

    public MessageCampaign() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public Integer getRecipientCount() { return recipientCount; }
    public void setRecipientCount(Integer recipientCount) { this.recipientCount = recipientCount; }

    public Integer getDeliveredCount() { return deliveredCount; }
    public void setDeliveredCount(Integer deliveredCount) { this.deliveredCount = deliveredCount; }

    public Integer getFailedCount() { return failedCount; }
    public void setFailedCount(Integer failedCount) { this.failedCount = failedCount; }

    public Double getOpenRate() { return openRate; }
    public void setOpenRate(Double openRate) { this.openRate = openRate; }

    public Double getClickRate() { return clickRate; }
    public void setClickRate(Double clickRate) { this.clickRate = clickRate; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }

    public Long getTemplateId() { return templateId; }
    public void setTemplateId(Long templateId) { this.templateId = templateId; }

    public boolean isPersonalization() { return personalization; }
    public void setPersonalization(boolean personalization) { this.personalization = personalization; }
}
