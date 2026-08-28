package com.company.project.dto.mobile.checkin;

import java.time.LocalDateTime;

public class MemberCheckOutResponseDTO {

    private boolean checkedIn;
    private Long attendanceId;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private Integer durationMinutes;

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
}
