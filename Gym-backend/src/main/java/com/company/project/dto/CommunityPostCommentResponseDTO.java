package com.company.project.dto;

import java.time.LocalDateTime;
import java.util.List;

public class CommunityPostCommentResponseDTO {

    private Long id;
    private Long postId;
    private String content;
    private Long authorUserId;
    private String authorUsername;
    private List<String> authorRoles;
    private LocalDateTime createdAt;

    public CommunityPostCommentResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPostId() { return postId; }
    public void setPostId(Long postId) { this.postId = postId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Long getAuthorUserId() { return authorUserId; }
    public void setAuthorUserId(Long authorUserId) { this.authorUserId = authorUserId; }

    public String getAuthorUsername() { return authorUsername; }
    public void setAuthorUsername(String authorUsername) { this.authorUsername = authorUsername; }

    public List<String> getAuthorRoles() { return authorRoles; }
    public void setAuthorRoles(List<String> authorRoles) { this.authorRoles = authorRoles; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

