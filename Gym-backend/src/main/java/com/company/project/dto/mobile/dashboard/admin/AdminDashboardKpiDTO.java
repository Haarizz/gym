package com.company.project.dto.mobile.dashboard.admin;

import java.math.BigDecimal;

public class AdminDashboardKpiDTO {

    private String id;
    private String label;
    // "currency" | "count" | "percent"
    private String unit;
    private BigDecimal value;
    // null when a prior-period comparison isn't meaningful (e.g. no prior-period data)
    private Double changePercent;
    private boolean clickable;
    // false only when the underlying data genuinely cannot be computed (never a
    // silent zero) — the frontend should render an "unavailable" state, not 0.
    private boolean available;

    public AdminDashboardKpiDTO() {}

    public static AdminDashboardKpiDTO of(String id, String label, String unit, BigDecimal value,
                                           Double changePercent, boolean clickable) {
        AdminDashboardKpiDTO dto = new AdminDashboardKpiDTO();
        dto.id = id;
        dto.label = label;
        dto.unit = unit;
        dto.value = value;
        dto.changePercent = changePercent;
        dto.clickable = clickable;
        dto.available = true;
        return dto;
    }

    public static AdminDashboardKpiDTO unavailable(String id, String label, String unit, boolean clickable) {
        AdminDashboardKpiDTO dto = new AdminDashboardKpiDTO();
        dto.id = id;
        dto.label = label;
        dto.unit = unit;
        dto.clickable = clickable;
        dto.available = false;
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }

    public Double getChangePercent() { return changePercent; }
    public void setChangePercent(Double changePercent) { this.changePercent = changePercent; }

    public boolean isClickable() { return clickable; }
    public void setClickable(boolean clickable) { this.clickable = clickable; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
