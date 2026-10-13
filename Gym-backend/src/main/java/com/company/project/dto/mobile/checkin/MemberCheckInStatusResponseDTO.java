package com.company.project.dto.mobile.checkin;

import java.time.LocalDateTime;

public class MemberCheckInStatusResponseDTO {

    private boolean checkedIn;
    private Long attendanceId;
    private LocalDateTime checkInTime;

    // Check-in allowance (CheckInPolicyService). limitValue == null means unlimited.
    private String limitUnit;
    private Integer limitValue;
    private Integer used;
    private String limitPeriod;
    private int checkInsToday;
    private int maxCheckInsPerDay;
    private LocalDateTime nextCheckInAllowedAt;
    private boolean canCheckIn;
    private String blockedReason;

    public MemberCheckInStatusResponseDTO() {}

    public MemberCheckInStatusResponseDTO(boolean checkedIn, Long attendanceId, LocalDateTime checkInTime) {
        this.checkedIn = checkedIn;
        this.attendanceId = attendanceId;
        this.checkInTime = checkInTime;
    }

    public boolean isCheckedIn() {
        return checkedIn;
    }

    public void setCheckedIn(boolean checkedIn) {
        this.checkedIn = checkedIn;
    }

    public Long getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(Long attendanceId) {
        this.attendanceId = attendanceId;
    }

    public LocalDateTime getCheckInTime() {
        return checkInTime;
    }

    public void setCheckInTime(LocalDateTime checkInTime) {
        this.checkInTime = checkInTime;
    }

    public String getLimitUnit() { return limitUnit; }
    public void setLimitUnit(String limitUnit) { this.limitUnit = limitUnit; }

    public Integer getLimitValue() { return limitValue; }
    public void setLimitValue(Integer limitValue) { this.limitValue = limitValue; }

    public Integer getUsed() { return used; }
    public void setUsed(Integer used) { this.used = used; }

    public String getLimitPeriod() { return limitPeriod; }
    public void setLimitPeriod(String limitPeriod) { this.limitPeriod = limitPeriod; }

    public int getCheckInsToday() { return checkInsToday; }
    public void setCheckInsToday(int checkInsToday) { this.checkInsToday = checkInsToday; }

    public int getMaxCheckInsPerDay() { return maxCheckInsPerDay; }
    public void setMaxCheckInsPerDay(int maxCheckInsPerDay) { this.maxCheckInsPerDay = maxCheckInsPerDay; }

    public LocalDateTime getNextCheckInAllowedAt() { return nextCheckInAllowedAt; }
    public void setNextCheckInAllowedAt(LocalDateTime nextCheckInAllowedAt) { this.nextCheckInAllowedAt = nextCheckInAllowedAt; }

    public boolean isCanCheckIn() { return canCheckIn; }
    public void setCanCheckIn(boolean canCheckIn) { this.canCheckIn = canCheckIn; }

    public String getBlockedReason() { return blockedReason; }
    public void setBlockedReason(String blockedReason) { this.blockedReason = blockedReason; }
}
