package com.company.project.dto;

import com.company.project.entities.MemberNote;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

public class MemberNoteResponseDTO {

    private Long id;
    private Long memberId;
    private String content;
    private String createdBy;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    public static MemberNoteResponseDTO fromEntity(MemberNote note) {
        MemberNoteResponseDTO dto = new MemberNoteResponseDTO();
        dto.id = note.getId();
        dto.memberId = note.getMemberId();
        dto.content = note.getContent();
        dto.createdBy = note.getCreatedBy();
        dto.createdAt = note.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
