package com.company.project.dto.mobile.checkin;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

public class MemberCheckOutResponseDTO {

    private boolean checkedIn;
    private Long attendanceId;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime checkInTime;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime checkOutTime;
    private Integer durationMinutes;
    private Integer workoutMinutes;

    public MemberCheckOutResponseDTO() {}

    public MemberCheckOutResponseDTO(boolean checkedIn, Long attendanceId, LocalDateTime checkInTime, LocalDateTime checkOutTime, Integer durationMinutes) {
        this.checkedIn = checkedIn;
        this.attendanceId = attendanceId;
        this.checkInTime = checkInTime;
        this.checkOutTime = checkOutTime;
        this.durationMinutes = durationMinutes;
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

    public LocalDateTime getCheckOutTime() {
        return checkOutTime;
    }

    public void setCheckOutTime(LocalDateTime checkOutTime) {
        this.checkOutTime = checkOutTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Integer getWorkoutMinutes() {
        return workoutMinutes;
    }

    public void setWorkoutMinutes(Integer workoutMinutes) {
        this.workoutMinutes = workoutMinutes;
    }
}
