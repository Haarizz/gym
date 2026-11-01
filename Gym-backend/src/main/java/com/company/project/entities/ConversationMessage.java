package com.company.project.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * One chat message. Never hard-deleted: deleting hides it from both sides, but a report
 * still shows it, with originalBody when contact-detail masking changed what was typed.
 * Not branch-aware itself; it's only ever reached through its Conversation.
 */
@Entity
@Table(name = "conversation_messages")
public class ConversationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    /** Conversation.MEMBER | Conversation.STAFF */
    @Column(name = "sender_type", nullable = false, length = 10)
    private String senderType;

    @Column(name = "sender_staff_id")
    private Long senderStaffId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "original_body", columnDefinition = "TEXT")
    private String originalBody;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public String getSenderType() { return senderType; }
    public void setSenderType(String senderType) { this.senderType = senderType; }

    public Long getSenderStaffId() { return senderStaffId; }
    public void setSenderStaffId(Long senderStaffId) { this.senderStaffId = senderStaffId; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getOriginalBody() { return originalBody; }
    public void setOriginalBody(String originalBody) { this.originalBody = originalBody; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
