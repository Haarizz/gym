package com.company.project.entities;

import jakarta.persistence.*;

// One row per (promotion, member) access-days application. The unique
// constraint is what makes "Apply Promotion" idempotent: re-running the same
// promotion (e.g. the admin double-clicks, or re-applies after adding more
// eligible members) never grants the same member extra days twice.
// Who/when applied it is already covered by BaseEntity's createdBy/createdAt.
@Entity
@Table(name = "promotion_access_days_audit",
        uniqueConstraints = @UniqueConstraint(columnNames = {"promotion_id", "member_id"}))
public class PromotionAccessDaysAudit extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "promotion_id", nullable = false)
    private Long promotionId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "rule_id")
    private String ruleId;

    @Column(name = "applied_days", nullable = false)
    private Integer appliedDays;

    public PromotionAccessDaysAudit() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public Integer getAppliedDays() { return appliedDays; }
    public void setAppliedDays(Integer appliedDays) { this.appliedDays = appliedDays; }
}
