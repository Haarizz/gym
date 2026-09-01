package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

// One row per branch holding the Attendance Reports page's "Schedule
// Automated Reports" toggle and gym floor capacity — previously that toggle
// was pure client-side React state with no backend, so it silently reset on
// every page reload and no report was ever actually sent (see
// AttendanceReportScheduler). Was a single global singleton (fixed id=1)
// until gym_capacity (different per branch) forced branch-scoping.
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "attendance_report_settings")
public class AttendanceReportSettings extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

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
