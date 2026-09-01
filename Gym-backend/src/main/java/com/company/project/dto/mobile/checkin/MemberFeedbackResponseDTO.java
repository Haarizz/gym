package com.company.project.dto.mobile.checkin;

public class MemberFeedbackResponseDTO {

    private boolean success;
    private Long attendanceId;

    public MemberFeedbackResponseDTO() {}

    public MemberFeedbackResponseDTO(boolean success, Long attendanceId) {
        this.success = success;
        this.attendanceId = attendanceId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public Long getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(Long attendanceId) {
        this.attendanceId = attendanceId;
    }
}
