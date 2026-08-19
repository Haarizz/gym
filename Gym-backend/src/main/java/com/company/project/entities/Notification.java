package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

@Filter(name = "branchFilter", condition = "branch_id = :branchId OR branch_id IS NULL")
@Entity
@Table(
    name = "notifications",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_company_event_key", columnNames = {"company_id", "event_key"})
    },
    indexes = {
        @Index(name = "idx_notif_user_unread",  columnList = "company_id, target_user_id, is_read, is_deleted"),
        @Index(name = "idx_notif_role_unread",  columnList = "company_id, target_role, is_read, is_deleted"),
        @Index(name = "idx_notif_priority_date", columnList = "company_id, is_deleted, priority, created_at")
    }
)
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tenant isolation — 1L for single-tenant deployments
    @Column(name = "company_id", nullable = false)
    private Long companyId = 1L;

    // Null when targeting a role; set when targeting a specific user
    @Column(name = "target_user_id")
    private Long targetUserId;

    // Null when targeting a specific user; e.g. "ADMIN", "ACCOUNTANT"
    @Column(name = "target_role")
    private String targetRole;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    // INFO | SUCCESS | WARNING | DANGER
    @Column(nullable = false)
    private String type = "INFO";

    // LOW | MEDIUM | HIGH | CRITICAL
    @Column(nullable = false)
    private String priority = "LOW";

    // MEMBERS | BILLING | BOOKINGS | LEADS | FOLLOW_UPS | FINANCIALS | PAYROLL | INVENTORY | ASSETS | GENERAL
    @Column(nullable = false)
    private String module = "GENERAL";

    // ID of the related entity (for deep linking)
    @Column(name = "reference_id")
    private Long referenceId;

    // Frontend route to navigate to on click (e.g. "/members", "/leads")
    @Column(name = "action_url")
    private String actionUrl;

    // For aggregated notifications: how many events are batched
    @Column(nullable = false)
    private int count = 1;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    // Idempotency key — unique per company; null for non-idempotent notifications
    @Column(name = "event_key")
    private String eventKey;

    public Notification() {}

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }

    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }

    public String getTargetRole() { return targetRole; }
    public void setTargetRole(String targetRole) { this.targetRole = targetRole; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean isRead) { this.isRead = isRead; }

    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean isDeleted) { this.isDeleted = isDeleted; }

    public String getEventKey() { return eventKey; }
    public void setEventKey(String eventKey) { this.eventKey = eventKey; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @jakarta.persistence.PrePersist
    public void prePersistBranchId() {
        if (this.branchId == null) {
            Long activeBranch = com.company.project.security.BranchContextHolder.getActiveBranchId();
            if (activeBranch != null) {
                this.branchId = activeBranch;
            }
        }
    }
}
