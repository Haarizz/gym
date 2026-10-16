package com.company.project.dto.mobile.checkin;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

/** Workout timer on the member's current visit — returned by workout start/end. */
public class MemberWorkoutResponseDTO {

    private Long attendanceId;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime workoutStartTime;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime workoutEndTime;
    private Integer workoutMinutes;

    public MemberWorkoutResponseDTO() {}

    public MemberWorkoutResponseDTO(Long attendanceId, LocalDateTime workoutStartTime,
                                    LocalDateTime workoutEndTime, Integer workoutMinutes) {
        this.attendanceId = attendanceId;
        this.workoutStartTime = workoutStartTime;
        this.workoutEndTime = workoutEndTime;
        this.workoutMinutes = workoutMinutes;
    }

    public Long getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Long attendanceId) { this.attendanceId = attendanceId; }

    public LocalDateTime getWorkoutStartTime() { return workoutStartTime; }
    public void setWorkoutStartTime(LocalDateTime workoutStartTime) { this.workoutStartTime = workoutStartTime; }

    public LocalDateTime getWorkoutEndTime() { return workoutEndTime; }
    public void setWorkoutEndTime(LocalDateTime workoutEndTime) { this.workoutEndTime = workoutEndTime; }

    public Integer getWorkoutMinutes() { return workoutMinutes; }
    public void setWorkoutMinutes(Integer workoutMinutes) { this.workoutMinutes = workoutMinutes; }
}
