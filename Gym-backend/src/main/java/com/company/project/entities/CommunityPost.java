package com.company.project.entities;

import jakarta.persistence.*;

// Deliberately not BranchAware: the community is shared across every branch (and,
// product-wise, every gym), so posts must not be hidden by the branch filter, and
// liking/commenting — which bumps the counters below — must not be rejected by
// BranchSecurityListener for a post from another branch or in "All Branches" mode.
// branch_id is still recorded for reference.
@Entity
@Table(name = "community_posts")
public class CommunityPost extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Exactly one of authorUser / authorMember is set: tenant logins (staff, gym-issued
    // member credentials) author as a User; GymBios app accounts have no tenant users
    // row and author as the Member their membership purchase created in this gym.
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

    @Column(nullable = false, length = 140)
    private String topic;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 32)
    private String type;

    @Lob
    @Column(name = "image_data_url")
    private String imageDataUrl;

    @Column(name = "image_aspect_ratio", length = 8)
    private String imageAspectRatio;

    @Column(name = "image_crop_position")
    private Integer imageCropPosition;

    @Column(name = "image_crop_zoom")
    private Integer imageCropZoom;

    @Column(name = "like_count", nullable = false)
    private int likeCount = 0;

    @Column(name = "comment_count", nullable = false)
    private int commentCount = 0;

    @Column(name = "archived", nullable = false, columnDefinition = "boolean default false")
    private boolean archived = false;

    public CommunityPost() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getAuthorUser() { return authorUser; }
    public void setAuthorUser(User authorUser) { this.authorUser = authorUser; }

    public Member getAuthorMember() { return authorMember; }
    public void setAuthorMember(Member authorMember) {
        this.authorMember = authorMember;
        this.authorMemberId = authorMember != null ? authorMember.getId() : null;
    }

    public Long getAuthorMemberId() { return authorMemberId; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getImageDataUrl() { return imageDataUrl; }
    public void setImageDataUrl(String imageDataUrl) { this.imageDataUrl = imageDataUrl; }

    public String getImageAspectRatio() { return imageAspectRatio; }
    public void setImageAspectRatio(String imageAspectRatio) { this.imageAspectRatio = imageAspectRatio; }

    public Integer getImageCropPosition() { return imageCropPosition; }
    public void setImageCropPosition(Integer imageCropPosition) { this.imageCropPosition = imageCropPosition; }

    public Integer getImageCropZoom() { return imageCropZoom; }
    public void setImageCropZoom(Integer imageCropZoom) { this.imageCropZoom = imageCropZoom; }

    public int getLikeCount() { return likeCount; }
    public void setLikeCount(int likeCount) { this.likeCount = likeCount; }

    public int getCommentCount() { return commentCount; }
    public void setCommentCount(int commentCount) { this.commentCount = commentCount; }

    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
