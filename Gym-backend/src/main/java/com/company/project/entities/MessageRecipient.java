package com.company.project.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_recipients")
public class MessageRecipient extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private MessageCampaign campaign;

    /** member | staff | prospect | external */
    @Column(name = "recipient_type")
    private String recipientType;

    @Column(name = "recipient_id")
    private String recipientId;

    private String name;
    private String email;
    private String phone;
    @Column(name = "membership_plan")
    private String membershipPlan;
    @Column(name = "membership_status")
    private String membershipStatus;
    private String location;
    @Column(name = "join_date")
    private java.time.LocalDateTime joinDate;
    @Column(name = "expiry_date")
    private java.time.LocalDateTime expiryDate;

    /** scheduled | sent | failed | delivered | read */
    private String status = "scheduled";

    @Column(name = "provider_message_id")
    private String providerMessageId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    public MessageRecipient() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MessageCampaign getCampaign() { return campaign; }
    public void setCampaign(MessageCampaign campaign) { this.campaign = campaign; }

    public String getRecipientType() { return recipientType; }
    public void setRecipientType(String recipientType) { this.recipientType = recipientType; }

    public String getRecipientId() { return recipientId; }
    public void setRecipientId(String recipientId) { this.recipientId = recipientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getMembershipPlan() { return membershipPlan; }
    public void setMembershipPlan(String membershipPlan) { this.membershipPlan = membershipPlan; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public java.time.LocalDateTime getJoinDate() { return joinDate; }
    public void setJoinDate(java.time.LocalDateTime joinDate) { this.joinDate = joinDate; }

    public java.time.LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(java.time.LocalDateTime expiryDate) { this.expiryDate = expiryDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProviderMessageId() { return providerMessageId; }
    public void setProviderMessageId(String providerMessageId) { this.providerMessageId = providerMessageId; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }

    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
