package com.company.project.dto.mobile.schedule;

import java.time.LocalTime;

public class MobileSessionDTO {
    private Long id;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer durationMinutes;
    private String type;
    private String status;
    private String memberName;
    private String name;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
