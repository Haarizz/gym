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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User authorUser;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    public CommunityPostComment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CommunityPost getPost() { return post; }
    public void setPost(CommunityPost post) { this.post = post; }

    public User getAuthorUser() { return authorUser; }
    public void setAuthorUser(User authorUser) { this.authorUser = authorUser; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}

