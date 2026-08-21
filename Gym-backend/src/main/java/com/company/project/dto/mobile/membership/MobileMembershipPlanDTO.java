package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;
import java.util.List;

public class MobileMembershipPlanDTO {
    private Long id;
    private String name;
    private BigDecimal price;
    private BigDecimal discount;
    private String duration;
    private List<String> features;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getDiscount() { return discount; }
    public void setDiscount(BigDecimal discount) { this.discount = discount; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }
}
