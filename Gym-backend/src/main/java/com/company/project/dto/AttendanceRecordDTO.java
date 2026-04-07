package com.company.project.dto;

import java.time.LocalDateTime;

public class AttendanceRecordDTO {

    private Long id;
    private Long memberId;      // DB primary key
    private String memberBizId; // MBR-XXXXXXXXXX
    private String memberName;
    private String photoUrl;
    private String membershipType;
    private String membershipStatus;
    private LocalDateTime checkInTime;
    private String checkInMethod;
    private String deviceId;
    private String resolvedBy;

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

    public String getCheckInMethod() { return checkInMethod; }
    public void setCheckInMethod(String checkInMethod) { this.checkInMethod = checkInMethod; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }
}
