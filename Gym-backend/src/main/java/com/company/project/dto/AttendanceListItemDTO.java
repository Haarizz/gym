package com.company.project.dto;

import java.time.LocalDateTime;

public class AttendanceListItemDTO {

    private Long id;
    // Member info (null for walk-ins)
    private Long memberDbId;
    private String memberBizId;
    private String memberName;
    private String photoUrl;
    private String membershipType;
    // Walk-in info (null for members)
    private String walkInName;
    private String walkInPhone;
    private String walkInEmail;
    private String walkInPaymentStatus;
    // Common
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private Integer totalMinutes;
    private String formattedDuration;   // "1h 30m"
    private String activityType;
    private String status;              // active | completed
    private String type;                // member | walk_in
    private String checkInMethod;
    private String deviceId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberBizId() { return memberBizId; }
    public void setMemberBizId(String memberBizId) { this.memberBizId = memberBizId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

    public String getWalkInName() { return walkInName; }
    public void setWalkInName(String walkInName) { this.walkInName = walkInName; }

    public String getWalkInPhone() { return walkInPhone; }
    public void setWalkInPhone(String walkInPhone) { this.walkInPhone = walkInPhone; }

    public String getWalkInEmail() { return walkInEmail; }
    public void setWalkInEmail(String walkInEmail) { this.walkInEmail = walkInEmail; }

    public String getWalkInPaymentStatus() { return walkInPaymentStatus; }
    public void setWalkInPaymentStatus(String walkInPaymentStatus) { this.walkInPaymentStatus = walkInPaymentStatus; }

    public LocalDateTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalDateTime checkInTime) { this.checkInTime = checkInTime; }

    public LocalDateTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalDateTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public Integer getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(Integer totalMinutes) { this.totalMinutes = totalMinutes; }

    public String getFormattedDuration() { return formattedDuration; }
    public void setFormattedDuration(String formattedDuration) { this.formattedDuration = formattedDuration; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCheckInMethod() { return checkInMethod; }
    public void setCheckInMethod(String checkInMethod) { this.checkInMethod = checkInMethod; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
}
