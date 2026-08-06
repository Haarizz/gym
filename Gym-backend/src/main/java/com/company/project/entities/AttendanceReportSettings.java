package com.company.project.entities;

import jakarta.persistence.*;

// Singleton row (always id=1) holding the Attendance Reports page's
// "Schedule Automated Reports" toggle — previously that toggle was pure
// client-side React state with no backend, so it silently reset on every
// page reload and no report was ever actually sent (see AttendanceReportScheduler).
@Entity
@Table(name = "attendance_report_settings")
public class AttendanceReportSettings extends BaseEntity {

    @Id
    private Long id = 1L;

    @Column(name = "enabled")
    private Boolean enabled = false;

    @Column(name = "recipient_email")
    private String recipientEmail;

    // Total gym floor capacity, used to compute the Check-In page's live
    // occupancy % — previously hardcoded to /150 with no way to configure it.
    @Column(name = "gym_capacity")
    private Integer gymCapacity = 150;

    public AttendanceReportSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public Integer getGymCapacity() { return gymCapacity; }
    public void setGymCapacity(Integer gymCapacity) { this.gymCapacity = gymCapacity; }
}
