package com.company.project.dto;

import java.time.LocalDateTime;
import java.util.List;

public class CommunityPostResponseDTO {

    private Long id;
    private String topic;
    private String content;
    private String type;
    private int likeCount;
    private int commentCount;
    private boolean likedByMe;
    private CommunityPostImageDTO image;
    private Long authorUserId;
    private String authorUsername;
    private List<String> authorRoles;
    private LocalDateTime createdAt;

    public CommunityPostResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public int getLikeCount() { return likeCount; }
    public void setLikeCount(int likeCount) { this.likeCount = likeCount; }

    public int getCommentCount() { return commentCount; }
    public void setCommentCount(int commentCount) { this.commentCount = commentCount; }

    public boolean isLikedByMe() { return likedByMe; }
    public void setLikedByMe(boolean likedByMe) { this.likedByMe = likedByMe; }

    public CommunityPostImageDTO getImage() { return image; }
    public void setImage(CommunityPostImageDTO image) { this.image = image; }

    public Long getAuthorUserId() { return authorUserId; }
    public void setAuthorUserId(Long authorUserId) { this.authorUserId = authorUserId; }

    public String getAuthorUsername() { return authorUsername; }
    public void setAuthorUsername(String authorUsername) { this.authorUsername = authorUsername; }

    public List<String> getAuthorRoles() { return authorRoles; }
    public void setAuthorRoles(List<String> authorRoles) { this.authorRoles = authorRoles; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
