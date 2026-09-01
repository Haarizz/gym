package com.company.project.dto.mobile.schedule;

import java.time.LocalDateTime;

public class StaffScheduleTaskDTO {
    private Long id;
    private LocalDateTime scheduledAt;
    private String type;
    private String priority;
    private String status;
    private String subject;
    private StaffScheduleContactDTO contact;

    public StaffScheduleTaskDTO() {}

    public StaffScheduleTaskDTO(Long id, LocalDateTime scheduledAt, String type, String priority, String status, String subject, StaffScheduleContactDTO contact) {
        this.id = id;
        this.scheduledAt = scheduledAt;
        this.type = type;
        this.priority = priority;
        this.status = status;
        this.subject = subject;
        this.contact = contact;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public StaffScheduleContactDTO getContact() { return contact; }
    public void setContact(StaffScheduleContactDTO contact) { this.contact = contact; }
}
