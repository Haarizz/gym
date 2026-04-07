package com.company.project.dto;

import java.time.LocalDateTime;

public class CheckOutResponse {

    private boolean success;
    private String message;
    private Long attendanceId;
    private LocalDateTime checkOutTime;
    private Integer totalMinutes;
    private String formattedDuration;   // "1h 30m"

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Long attendanceId) { this.attendanceId = attendanceId; }

    public LocalDateTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalDateTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public Integer getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(Integer totalMinutes) { this.totalMinutes = totalMinutes; }

    public String getFormattedDuration() { return formattedDuration; }
    public void setFormattedDuration(String formattedDuration) { this.formattedDuration = formattedDuration; }
}
