package com.company.project.dto.mobile.analytics;

import java.math.BigDecimal;

public class MonthlyTrendPointDTO {
    private String month;
    private BigDecimal revenue;

    public MonthlyTrendPointDTO() {}

    public MonthlyTrendPointDTO(String month, BigDecimal revenue) {
        this.month = month;
        this.revenue = revenue;
    }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
}
