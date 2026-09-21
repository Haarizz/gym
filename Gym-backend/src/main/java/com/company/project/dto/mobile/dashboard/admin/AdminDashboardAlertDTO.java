package com.company.project.dto.mobile.dashboard.admin;

public class AdminDashboardAlertDTO {

    private String text;
    private boolean urgent;
    // "membership_expiry" | "follow_up"
    private String type;

    public AdminDashboardAlertDTO() {}

    public AdminDashboardAlertDTO(String text, boolean urgent, String type) {
        this.text = text;
        this.urgent = urgent;
        this.type = type;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public boolean isUrgent() { return urgent; }
    public void setUrgent(boolean urgent) { this.urgent = urgent; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
