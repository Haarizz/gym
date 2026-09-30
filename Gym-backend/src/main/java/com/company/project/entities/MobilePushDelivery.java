package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Record of one push notification sent to a member, keyed so the same reminder
 * is never pushed twice (e.g. "OUTSTANDING_BALANCE_W{workflowId}_M{memberId}_{date}").
 */
@Entity
@Table(name = "mobile_push_deliveries")
public class MobilePushDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "delivery_key", nullable = false, unique = true)
    private String deliveryKey;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "workflow_id")
    private Long workflowId;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();

    public MobilePushDelivery() {}

    public MobilePushDelivery(String deliveryKey, Long memberId, Long workflowId) {
        this.deliveryKey = deliveryKey;
        this.memberId = memberId;
        this.workflowId = workflowId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDeliveryKey() { return deliveryKey; }
    public void setDeliveryKey(String deliveryKey) { this.deliveryKey = deliveryKey; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public Long getWorkflowId() { return workflowId; }
    public void setWorkflowId(Long workflowId) { this.workflowId = workflowId; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}
