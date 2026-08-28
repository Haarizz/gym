package com.company.project.dto.mobile.schedule;

import java.time.LocalDateTime;

public class UpcomingFollowUpDTO {
    private Long id;
    private LocalDateTime scheduledAt;
    private String subject;
    private String type;
    private StaffScheduleContactDTO contact;

    public UpcomingFollowUpDTO() {}

    public UpcomingFollowUpDTO(Long id, LocalDateTime scheduledAt, String subject, String type, StaffScheduleContactDTO contact) {
        this.id = id;
        this.scheduledAt = scheduledAt;
        this.subject = subject;
        this.type = type;
        this.contact = contact;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public StaffScheduleContactDTO getContact() { return contact; }
    public void setContact(StaffScheduleContactDTO contact) { this.contact = contact; }
}
