package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// One row per promotion redemption. PromotionCampaign only keeps running
// totals (usageCount / totalRevenue), which can't answer "how much did deals
// bring in this month" — this ledger can.
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "promotion_redemptions")
public class PromotionRedemption extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "promotion_id", nullable = false)
    private Long promotionId;

    // Member db id, when the caller knows who redeemed it.
    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "revenue", precision = 12, scale = 2)
    private BigDecimal revenue;

    @Column(name = "savings", precision = 12, scale = 2)
    private BigDecimal savings;

    @Column(name = "redeemed_at", nullable = false)
    private LocalDateTime redeemedAt;

    @Column(name = "branch_id")
    private Long branchId;

    public PromotionRedemption() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }

    public BigDecimal getSavings() { return savings; }
    public void setSavings(BigDecimal savings) { this.savings = savings; }

    public LocalDateTime getRedeemedAt() { return redeemedAt; }
    public void setRedeemedAt(LocalDateTime redeemedAt) { this.redeemedAt = redeemedAt; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
