package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;
import java.util.List;

public class MobileMembershipPlanDTO {
    private Long id;
    private String name;
    private BigDecimal price;
    /** The plan offer's discount today (flat amount off price); 0 when none. */
    private BigDecimal discount;
    private String offerLabel;
    /** price − discount: what the member pays before any code or Reward Pass. */
    private BigDecimal effectivePrice;
    private String duration;
    // Family/Couple plans are bought through the family flow (/api/mobile/family/convert).
    private String planType;
    private List<String> features;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getDiscount() { return discount; }
    public void setDiscount(BigDecimal discount) { this.discount = discount; }

    public String getOfferLabel() { return offerLabel; }
    public void setOfferLabel(String offerLabel) { this.offerLabel = offerLabel; }

    public BigDecimal getEffectivePrice() { return effectivePrice; }
    public void setEffectivePrice(BigDecimal effectivePrice) { this.effectivePrice = effectivePrice; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public String getPlanType() { return planType; }
    public void setPlanType(String planType) { this.planType = planType; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }
}
