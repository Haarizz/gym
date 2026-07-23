package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(
        name = "community_post_likes",
        uniqueConstraints = @UniqueConstraint(name = "uq_community_post_like", columnNames = {"post_id", "user_id"})
)
public class CommunityPostLike extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public CommunityPostLike() {}

    public CommunityPostLike(CommunityPost post, User user) {
        this.post = post;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CommunityPost getPost() { return post; }
    public void setPost(CommunityPost post) { this.post = post; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}

