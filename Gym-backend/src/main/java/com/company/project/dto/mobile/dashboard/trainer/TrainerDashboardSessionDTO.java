package com.company.project.dto.mobile.dashboard.trainer;

import java.time.LocalDateTime;

public class TrainerDashboardSessionDTO {
    private Long id;
    private LocalDateTime startTime;
    private String memberName;
    private String type;
    private String focus;
    private String status;

    public TrainerDashboardSessionDTO() {}

    public TrainerDashboardSessionDTO(Long id, LocalDateTime startTime, String memberName, String type, String focus, String status) {
        this.id = id;
        this.startTime = startTime;
        this.memberName = memberName;
        this.type = type;
        this.focus = focus;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public String getMemberName() {
        return memberName;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getFocus() {
        return focus;
    }

    public void setFocus(String focus) {
        this.focus = focus;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
