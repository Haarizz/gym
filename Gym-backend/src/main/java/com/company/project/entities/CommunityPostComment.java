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

    // Exactly one of authorUser / authorMember is set: tenant logins (staff, gym-issued
    // member credentials) author as a User; GymBios app accounts have no tenant users
    // row and author as the Member their membership purchase created in this gym.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_user_id")
    private User authorUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_member_id")
    private Member authorMember;

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
    public void setAuthorMember(Member authorMember) { this.authorMember = authorMember; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}

