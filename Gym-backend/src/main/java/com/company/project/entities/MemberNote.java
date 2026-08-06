package com.company.project.entities;

import jakarta.persistence.*;

// A free-text staff note attached to a member (Member Analytics → Notes tab).
// "Who" and "when" come from BaseEntity's createdBy/createdAt (see AuditConfig's
// AuditorAware), same convention as RewardAuditLog.
@Entity
@Table(name = "member_notes")
public class MemberNote extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    public MemberNote() {}

    public MemberNote(Long memberId, String content) {
        this.memberId = memberId;
        this.content = content;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
