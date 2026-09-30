package com.company.project.dto;

import java.math.BigDecimal;

/**
 * What a code typed into a checkout's promo field resolved to — either a
 * PromotionCampaign code or a shareable COUPON reward code. Checkout screens
 * apply both the same way; only how they're spent differs (promotionId →
 * /promotions/{id}/redeem as before, COUPON → send the code as couponCode on
 * the purchase/renewal so the server spends it). The mobile new-member purchase
 * sends either kind as couponCode; DiscountCodeService.redeemAtCheckout spends both.
 */
public class DiscountCodeDTO {

    private String source;          // PROMOTION / COUPON
    private Long promotionId;       // PROMOTION only
    private String code;
    private String name;
    private String discountType;    // percentage / fixed — same vocabulary as promotions
    private BigDecimal discountValue;
    private BigDecimal discountAmount;  // only when validated against an amount

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }

    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
}
