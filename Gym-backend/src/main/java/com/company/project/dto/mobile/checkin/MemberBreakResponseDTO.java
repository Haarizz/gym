package com.company.project.dto.mobile.checkin;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

/** Take Break on the member's current visit — returned by break start/resume. */
public class MemberBreakResponseDTO {

    private Long attendanceId;
    // Running break start (null when not on a break) and minutes of finished breaks
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime breakStartTime;
    private Integer breakMinutes;

    public MemberBreakResponseDTO() {}

    public MemberBreakResponseDTO(Long attendanceId, LocalDateTime breakStartTime, Integer breakMinutes) {
        this.attendanceId = attendanceId;
        this.breakStartTime = breakStartTime;
        this.breakMinutes = breakMinutes;
    }

    public Long getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Long attendanceId) { this.attendanceId = attendanceId; }

    public LocalDateTime getBreakStartTime() { return breakStartTime; }
    public void setBreakStartTime(LocalDateTime breakStartTime) { this.breakStartTime = breakStartTime; }

    public Integer getBreakMinutes() { return breakMinutes; }
    public void setBreakMinutes(Integer breakMinutes) { this.breakMinutes = breakMinutes; }
}
