package com.company.project.dto.mobile.checkin;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

public class MemberCheckInStatusResponseDTO {

    private boolean checkedIn;
    private Long attendanceId;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime checkInTime;

    // Workout timer on the current visit (null until started / while running)
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime workoutStartTime;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime workoutEndTime;
    private Integer workoutMinutes;

    // A visit from an earlier day with no check-out. The member is not "checked in";
    // the next check-in closes it at unclosedAutoCloseTime.
    private Long unclosedAttendanceId;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime unclosedCheckInTime;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime unclosedAutoCloseTime;

    // Check-in allowance (CheckInPolicyService). limitValue == null means unlimited.
    private String limitUnit;
    private Integer limitValue;
    private Integer used;
    private String limitPeriod;
    private int checkInsToday;
    private int maxCheckInsPerDay;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
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

    public LocalDateTime getWorkoutStartTime() { return workoutStartTime; }
    public void setWorkoutStartTime(LocalDateTime workoutStartTime) { this.workoutStartTime = workoutStartTime; }

    public LocalDateTime getWorkoutEndTime() { return workoutEndTime; }
    public void setWorkoutEndTime(LocalDateTime workoutEndTime) { this.workoutEndTime = workoutEndTime; }

    public Integer getWorkoutMinutes() { return workoutMinutes; }
    public void setWorkoutMinutes(Integer workoutMinutes) { this.workoutMinutes = workoutMinutes; }

    public Long getUnclosedAttendanceId() { return unclosedAttendanceId; }
    public void setUnclosedAttendanceId(Long unclosedAttendanceId) { this.unclosedAttendanceId = unclosedAttendanceId; }

    public LocalDateTime getUnclosedCheckInTime() { return unclosedCheckInTime; }
    public void setUnclosedCheckInTime(LocalDateTime unclosedCheckInTime) { this.unclosedCheckInTime = unclosedCheckInTime; }

    public LocalDateTime getUnclosedAutoCloseTime() { return unclosedAutoCloseTime; }
    public void setUnclosedAutoCloseTime(LocalDateTime unclosedAutoCloseTime) { this.unclosedAutoCloseTime = unclosedAutoCloseTime; }

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
