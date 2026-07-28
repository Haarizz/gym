package com.company.project.dto;

import java.util.List;

public class CommunityEngagementStatsDTO {

    private long totalPosts;
    private long totalLikes;
    private long totalComments;
    private List<TypeBreakdown> byType;
    private List<WeeklyPoint> weekly;

    public long getTotalPosts() { return totalPosts; }
    public void setTotalPosts(long totalPosts) { this.totalPosts = totalPosts; }

    public long getTotalLikes() { return totalLikes; }
    public void setTotalLikes(long totalLikes) { this.totalLikes = totalLikes; }

    public long getTotalComments() { return totalComments; }
    public void setTotalComments(long totalComments) { this.totalComments = totalComments; }

    public List<TypeBreakdown> getByType() { return byType; }
    public void setByType(List<TypeBreakdown> byType) { this.byType = byType; }

    public List<WeeklyPoint> getWeekly() { return weekly; }
    public void setWeekly(List<WeeklyPoint> weekly) { this.weekly = weekly; }

    /** Real post-type breakdown (achievement / question / tip, ...) — no invented "features". */
    public static class TypeBreakdown {
        private String type;
        private long posts;
        private long likes;
        private long comments;

        public TypeBreakdown() {}

        public TypeBreakdown(String type, long posts, long likes, long comments) {
            this.type = type;
            this.posts = posts;
            this.likes = likes;
            this.comments = comments;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public long getPosts() { return posts; }
        public void setPosts(long posts) { this.posts = posts; }

        public long getLikes() { return likes; }
        public void setLikes(long likes) { this.likes = likes; }

        public long getComments() { return comments; }
        public void setComments(long comments) { this.comments = comments; }
    }

    public static class WeeklyPoint {
        private String weekLabel;
        private long posts;
        private long likes;
        private long comments;

        public WeeklyPoint() {}

        public WeeklyPoint(String weekLabel, long posts, long likes, long comments) {
            this.weekLabel = weekLabel;
            this.posts = posts;
            this.likes = likes;
            this.comments = comments;
        }

        public String getWeekLabel() { return weekLabel; }
        public void setWeekLabel(String weekLabel) { this.weekLabel = weekLabel; }

        public long getPosts() { return posts; }
        public void setPosts(long posts) { this.posts = posts; }

        public long getLikes() { return likes; }
        public void setLikes(long likes) { this.likes = likes; }

        public long getComments() { return comments; }
        public void setComments(long comments) { this.comments = comments; }
    }
}
