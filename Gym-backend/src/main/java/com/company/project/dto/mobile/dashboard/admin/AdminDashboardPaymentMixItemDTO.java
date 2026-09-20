package com.company.project.dto.mobile.dashboard.admin;

import java.math.BigDecimal;

public class AdminDashboardPaymentMixItemDTO {

    private String mode;
    private BigDecimal amount;
    private double percentage;

    public AdminDashboardPaymentMixItemDTO() {}

    public AdminDashboardPaymentMixItemDTO(String mode, BigDecimal amount, double percentage) {
        this.mode = mode;
        this.amount = amount;
        this.percentage = percentage;
    }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }
}
