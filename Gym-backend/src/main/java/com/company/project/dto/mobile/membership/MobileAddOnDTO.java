package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;

public class MobileAddOnDTO {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer validity;
    private String category;
    
    private String currency = "INR";
    private String pricingUnit;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getValidity() { return validity; }
    public void setValidity(Integer validity) { this.validity = validity; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPricingUnit() { return pricingUnit; }
    public void setPricingUnit(String pricingUnit) { this.pricingUnit = pricingUnit; }
}
