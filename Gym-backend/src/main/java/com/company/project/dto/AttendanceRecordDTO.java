package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

public class AttendanceRecordDTO {

    private Long id;
    private Long memberId;      // DB primary key
    private String memberBizId; // MBR-XXXXXXXXXX
    private String memberName;
    private String photoUrl;
    private String membershipType;
    private String membershipStatus;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime checkInTime;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime checkOutTime;
    private Integer totalMinutes;
    private String formattedDuration;
    private String checkInMethod;
    private String deviceId;
    private String resolvedBy;
    private String status;      // active | completed
    private String type;        // member | walk_in
    private String walkInName;
    private String walkInPhone;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberBizId() { return memberBizId; }
    public void setMemberBizId(String memberBizId) { this.memberBizId = memberBizId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }

    public LocalDateTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalDateTime checkInTime) { this.checkInTime = checkInTime; }

    public LocalDateTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalDateTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public Integer getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(Integer totalMinutes) { this.totalMinutes = totalMinutes; }

    public String getFormattedDuration() { return formattedDuration; }
    public void setFormattedDuration(String formattedDuration) { this.formattedDuration = formattedDuration; }

    public String getCheckInMethod() { return checkInMethod; }
    public void setCheckInMethod(String checkInMethod) { this.checkInMethod = checkInMethod; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getWalkInName() { return walkInName; }
    public void setWalkInName(String walkInName) { this.walkInName = walkInName; }

    public String getWalkInPhone() { return walkInPhone; }
    public void setWalkInPhone(String walkInPhone) { this.walkInPhone = walkInPhone; }
}
