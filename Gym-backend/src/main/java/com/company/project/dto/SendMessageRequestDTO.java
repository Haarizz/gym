package com.company.project.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class SendMessageRequestDTO {
    private String type;
    private String subject;
    private String content;
    private List<MessageRecipientSelectionDTO> recipients = new ArrayList<>();
    private List<String> groupIds = new ArrayList<>();
    private Boolean personalization = true;
    private LocalDateTime scheduledAt;
    private Long templateId;

    public SendMessageRequestDTO() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public List<MessageRecipientSelectionDTO> getRecipients() { return recipients; }
    public void setRecipients(List<MessageRecipientSelectionDTO> recipients) { this.recipients = recipients; }

    public List<String> getGroupIds() { return groupIds; }
    public void setGroupIds(List<String> groupIds) { this.groupIds = groupIds; }

    public Boolean getPersonalization() { return personalization; }
    public void setPersonalization(Boolean personalization) { this.personalization = personalization; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public Long getTemplateId() { return templateId; }
    public void setTemplateId(Long templateId) { this.templateId = templateId; }
}
