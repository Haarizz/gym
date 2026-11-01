package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A member or staff member reporting a chat message. The only way an admin sees a
 * conversation: the report opens the whole conversation up to the moment it was filed.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "conversation_reports")
public class ConversationReport extends BaseEntity implements BranchAware {

    public static final String OPEN = "OPEN";
    public static final String DISMISSED = "DISMISSED";
    public static final String ACTIONED = "ACTIONED";

    public static final List<String> REASONS = List.of(
            "HARASSMENT", "SPAM", "INAPPROPRIATE", "OFF_PLATFORM", "OTHER");

    public static final String DISMISS = "DISMISS";
    public static final String BLOCK_CONVERSATION = "BLOCK_CONVERSATION";
    public static final String BAN_MEMBER = "BAN_MEMBER";
    public static final List<String> RESOLUTIONS = List.of(DISMISS, BLOCK_CONVERSATION, BAN_MEMBER);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    /** Conversation.MEMBER | Conversation.STAFF */
    @Column(name = "reported_by_type", nullable = false, length = 10)
    private String reportedByType;

    /** members.id or employees.id, per reportedByType. */
    @Column(name = "reported_by_id", nullable = false)
    private Long reportedById;

    @Column(nullable = false, length = 30)
    private String reason;

    @Column(length = 500)
    private String details;

    @Column(nullable = false, length = 20)
    private String status = OPEN;

    @Column(length = 30)
    private String resolution;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @Column(name = "resolved_by")
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }

    public String getReportedByType() { return reportedByType; }
    public void setReportedByType(String reportedByType) { this.reportedByType = reportedByType; }

    public Long getReportedById() { return reportedById; }
    public void setReportedById(Long reportedById) { this.reportedById = reportedById; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getResolution() { return resolution; }
    public void setResolution(String resolution) { this.resolution = resolution; }

    public String getResolutionNote() { return resolutionNote; }
    public void setResolutionNote(String resolutionNote) { this.resolutionNote = resolutionNote; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    @Override
    public Long getBranchId() { return branchId; }

    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
