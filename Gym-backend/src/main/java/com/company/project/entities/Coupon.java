package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

// Generated lazily when a COUPON-type ReferralReward is created, so "Copy Coupon"
// always has a code ready. Validated/consumed at checkout (add-member,
// renew-upgrade, member-addons) via CouponService.
@Entity
@Table(name = "coupons")
public class Coupon extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true, nullable = false)
    private String code;

    @Column(name = "reward_id", nullable = false)
    private Long rewardId;

    @Column(name = "discount_value", precision = 10, scale = 2)
    private BigDecimal discountValue;

    // AMOUNT / PERCENT
    @Column(name = "discount_unit")
    private String discountUnit;

    @Column(name = "currency")
    private String currency;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "max_uses")
    private Integer maxUses = 1;

    @Column(name = "used_count")
    private Integer usedCount = 0;

    // ACTIVE / USED / EXPIRED / CANCELLED
    @Column(name = "status")
    private String status = "ACTIVE";

    public Coupon() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public Long getRewardId() { return rewardId; }
    public void setRewardId(Long rewardId) { this.rewardId = rewardId; }

    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

    public String getDiscountUnit() { return discountUnit; }
    public void setDiscountUnit(String discountUnit) { this.discountUnit = discountUnit; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public Integer getMaxUses() { return maxUses; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }

    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
