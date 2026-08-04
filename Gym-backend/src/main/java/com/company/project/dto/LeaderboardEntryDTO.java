package com.company.project.dto;

public class LeaderboardEntryDTO {

    private Long userId;
    private String username;
    private int totalPosts;
    private long totalLikes;
    private long totalComments;
    private long engagementScore;

    public LeaderboardEntryDTO() {}

    public LeaderboardEntryDTO(Long userId, String username, int totalPosts, long totalLikes, long totalComments) {
        this.userId = userId;
        this.username = username;
        this.totalPosts = totalPosts;
        this.totalLikes = totalLikes;
        this.totalComments = totalComments;
        this.engagementScore = totalLikes + totalComments;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public int getTotalPosts() { return totalPosts; }
    public void setTotalPosts(int totalPosts) { this.totalPosts = totalPosts; }

    public long getTotalLikes() { return totalLikes; }
    public void setTotalLikes(long totalLikes) { this.totalLikes = totalLikes; }

    public long getTotalComments() { return totalComments; }
    public void setTotalComments(long totalComments) { this.totalComments = totalComments; }

    public long getEngagementScore() { return engagementScore; }
    public void setEngagementScore(long engagementScore) { this.engagementScore = engagementScore; }
}
