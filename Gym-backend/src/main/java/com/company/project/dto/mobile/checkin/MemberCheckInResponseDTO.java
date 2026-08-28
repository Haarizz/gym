package com.company.project.dto.mobile.checkin;

import java.time.LocalDateTime;

public class MemberCheckInResponseDTO {

    private boolean checkedIn;
    private Long attendanceId;
    private LocalDateTime checkInTime;

    public MemberCheckInResponseDTO() {}

    public MemberCheckInResponseDTO(boolean checkedIn, Long attendanceId, LocalDateTime checkInTime) {
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
}
