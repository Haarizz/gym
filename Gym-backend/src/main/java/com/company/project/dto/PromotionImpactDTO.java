package com.company.project.dto;

import java.math.BigDecimal;

/** Month-scoped revenue and new-member conversions attributable to promotions and referrals. */
public class PromotionImpactDTO {

    /** yyyy-MM of the window this covers. */
    private String month;
    private BigDecimal revenueFromDeals;
    private BigDecimal promotionRevenue;
    private BigDecimal referralRevenue;
    private long newMembers;
    private long promotionRedemptions;
    private long referralConversions;

    public PromotionImpactDTO(String month, BigDecimal promotionRevenue, BigDecimal referralRevenue,
                              long newMembers, long promotionRedemptions, long referralConversions) {
        this.month = month;
        this.promotionRevenue = promotionRevenue;
        this.referralRevenue = referralRevenue;
        this.revenueFromDeals = promotionRevenue.add(referralRevenue);
        this.newMembers = newMembers;
        this.promotionRedemptions = promotionRedemptions;
        this.referralConversions = referralConversions;
    }

    public String getMonth() { return month; }
    public BigDecimal getRevenueFromDeals() { return revenueFromDeals; }
    public BigDecimal getPromotionRevenue() { return promotionRevenue; }
    public BigDecimal getReferralRevenue() { return referralRevenue; }
    public long getNewMembers() { return newMembers; }
    public long getPromotionRedemptions() { return promotionRedemptions; }
    public long getReferralConversions() { return referralConversions; }
}
