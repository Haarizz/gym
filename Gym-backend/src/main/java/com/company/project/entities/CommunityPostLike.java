package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(
        name = "community_post_likes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_community_post_like", columnNames = {"post_id", "user_id"}),
                @UniqueConstraint(name = "uq_community_post_member_like", columnNames = {"post_id", "member_id"})
        }
)
public class CommunityPostLike extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    // Exactly one of user / member is set — see CommunityPost.authorMember.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    public CommunityPostLike() {}

    public CommunityPostLike(CommunityPost post, User user) {
        this.post = post;
        this.user = user;
    }

    public CommunityPostLike(CommunityPost post, Member member) {
        this.post = post;
        this.member = member;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CommunityPost getPost() { return post; }
    public void setPost(CommunityPost post) { this.post = post; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Member getMember() { return member; }
    public void setMember(Member member) { this.member = member; }
}

