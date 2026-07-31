package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

public class NotificationResponseDTO {

    private Long id;
    private String title;
    private String message;
    private String type;
    private String priority;
    private String module;
    private Long referenceId;
    private String actionUrl;
    private int count;
    private boolean isRead;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    public NotificationResponseDTO() {}

    public NotificationResponseDTO(Long id, String title, String message, String type,
                                   String priority, String module, Long referenceId,
                                   String actionUrl, int count, boolean isRead,
                                   LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.message = message;
        this.type = type;
        this.priority = priority;
        this.module = module;
        this.referenceId = referenceId;
        this.actionUrl = actionUrl;
        this.count = count;
        this.isRead = isRead;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean isRead) { this.isRead = isRead; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
