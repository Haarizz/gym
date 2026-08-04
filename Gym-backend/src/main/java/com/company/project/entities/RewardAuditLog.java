package com.company.project.entities;

import com.company.project.enums.RewardAuditAction;
import jakarta.persistence.*;

// Full history trail for one ReferralReward — who did what and when. "Who" and
// "when" for the row itself is BaseEntity's createdBy/createdAt (see
// AuditConfig's AuditorAware), matching the convention already used by
// JournalEntrySource/PromotionAccessDaysAudit.
@Entity
@Table(name = "reward_audit_logs")
public class RewardAuditLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reward_id", nullable = false)
    private Long rewardId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private RewardAuditAction action;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    public RewardAuditLog() {}

    public RewardAuditLog(Long rewardId, RewardAuditAction action, String performedBy, String remarks) {
        this.rewardId = rewardId;
        this.action = action;
        this.performedBy = performedBy;
        this.remarks = remarks;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRewardId() { return rewardId; }
    public void setRewardId(Long rewardId) { this.rewardId = rewardId; }

    public RewardAuditAction getAction() { return action; }
    public void setAction(RewardAuditAction action) { this.action = action; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
