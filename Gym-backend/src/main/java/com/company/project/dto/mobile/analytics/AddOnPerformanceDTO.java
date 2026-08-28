package com.company.project.dto.mobile.analytics;

import java.math.BigDecimal;

public class AddOnPerformanceDTO {
    private String name;
    private BigDecimal revenue;

    public AddOnPerformanceDTO() {}

    public AddOnPerformanceDTO(String name, BigDecimal revenue) {
        this.name = name;
        this.revenue = revenue;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
}
