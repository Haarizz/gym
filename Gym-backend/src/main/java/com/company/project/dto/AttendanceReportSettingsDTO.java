package com.company.project.dto;

public class AttendanceReportSettingsDTO {

    private Boolean enabled;
    private String recipientEmail;
    private Integer gymCapacity;

    public AttendanceReportSettingsDTO() {}

    public AttendanceReportSettingsDTO(Boolean enabled, String recipientEmail, Integer gymCapacity) {
        this.enabled = enabled;
        this.recipientEmail = recipientEmail;
        this.gymCapacity = gymCapacity;
    }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public Integer getGymCapacity() { return gymCapacity; }
    public void setGymCapacity(Integer gymCapacity) { this.gymCapacity = gymCapacity; }
}
