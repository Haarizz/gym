package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "community_post_comments")
public class CommunityPostComment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    // Exactly one of authorUser / authorMember / authorGlobalUserId is set: tenant logins
    // (staff, gym-issued member credentials) author as a User; GymBios app accounts have
    // no tenant users row and author as the Member their membership purchase created in
    // this gym — or, when their membership is at another gym, as the global account
    // itself, with their name captured here since that profile lives in another database.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_user_id")
    private User authorUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_member_id")
    private Member authorMember;

    // Same column, read as a plain id. Authors can be members of another branch, and
    // loading that Member trips BranchSecurityListener's read isolation — so community
    // reads use this id (plus a batched name lookup) and never touch authorMember.
    @Column(name = "author_member_id", insertable = false, updatable = false)
    private Long authorMemberId;

    @Column(name = "author_global_user_id")
    private Long authorGlobalUserId;

    @Column(name = "author_display_name")
    private String authorDisplayName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    public CommunityPostComment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CommunityPost getPost() { return post; }
    public void setPost(CommunityPost post) { this.post = post; }

    public User getAuthorUser() { return authorUser; }
    public void setAuthorUser(User authorUser) { this.authorUser = authorUser; }

    public Member getAuthorMember() { return authorMember; }
    public void setAuthorMember(Member authorMember) {
        this.authorMember = authorMember;
        this.authorMemberId = authorMember != null ? authorMember.getId() : null;
    }

    public Long getAuthorMemberId() { return authorMemberId; }

    public Long getAuthorGlobalUserId() { return authorGlobalUserId; }
    public void setAuthorGlobalUserId(Long authorGlobalUserId) { this.authorGlobalUserId = authorGlobalUserId; }

    public String getAuthorDisplayName() { return authorDisplayName; }
    public void setAuthorDisplayName(String authorDisplayName) { this.authorDisplayName = authorDisplayName; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}

