package com.company.project.dto;

import java.time.LocalDateTime;

public class StaffAttendanceDTO {

    private Long id;
    private Long staffDbId;
    private String staffBizId;      // EMP-...
    private String staffName;
    private String staffRole;
    private String staffDepartment;
    private String photoUrl;
    private LocalDateTime clockInTime;
    private LocalDateTime clockOutTime;
    private Integer totalMinutes;
    private String formattedDuration;
    private String status;           // working | completed
    private String deviceId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStaffDbId() { return staffDbId; }
    public void setStaffDbId(Long staffDbId) { this.staffDbId = staffDbId; }

    public String getStaffBizId() { return staffBizId; }
    public void setStaffBizId(String staffBizId) { this.staffBizId = staffBizId; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getStaffRole() { return staffRole; }
    public void setStaffRole(String staffRole) { this.staffRole = staffRole; }

    public String getStaffDepartment() { return staffDepartment; }
    public void setStaffDepartment(String staffDepartment) { this.staffDepartment = staffDepartment; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public LocalDateTime getClockInTime() { return clockInTime; }
    public void setClockInTime(LocalDateTime clockInTime) { this.clockInTime = clockInTime; }

    public LocalDateTime getClockOutTime() { return clockOutTime; }
    public void setClockOutTime(LocalDateTime clockOutTime) { this.clockOutTime = clockOutTime; }

    public Integer getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(Integer totalMinutes) { this.totalMinutes = totalMinutes; }

    public String getFormattedDuration() { return formattedDuration; }
    public void setFormattedDuration(String formattedDuration) { this.formattedDuration = formattedDuration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
}
