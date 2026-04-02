package com.company.project.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class TrainingStreamAnalyticsDTO {

    @JsonProperty("live_count")
    private long liveCount;

    @JsonProperty("scheduled_count")
    private long scheduledCount;

    @JsonProperty("active_viewers")
    private long activeViewers;

    @JsonProperty("avg_views")
    private long avgViews;

    @JsonProperty("total_streams")
    private long totalStreams;

    @JsonProperty("total_views")
    private long totalViews;

    @JsonProperty("engagement_rate")
    private int engagementRate;

    @JsonProperty("category_stats")
    private List<Map<String, Object>> categoryStats;

    public long getLiveCount() { return liveCount; }
    public void setLiveCount(long liveCount) { this.liveCount = liveCount; }

    public long getScheduledCount() { return scheduledCount; }
    public void setScheduledCount(long scheduledCount) { this.scheduledCount = scheduledCount; }

    public long getActiveViewers() { return activeViewers; }
    public void setActiveViewers(long activeViewers) { this.activeViewers = activeViewers; }

    public long getAvgViews() { return avgViews; }
    public void setAvgViews(long avgViews) { this.avgViews = avgViews; }

    public long getTotalStreams() { return totalStreams; }
    public void setTotalStreams(long totalStreams) { this.totalStreams = totalStreams; }

    public long getTotalViews() { return totalViews; }
    public void setTotalViews(long totalViews) { this.totalViews = totalViews; }

    public int getEngagementRate() { return engagementRate; }
    public void setEngagementRate(int engagementRate) { this.engagementRate = engagementRate; }

    public List<Map<String, Object>> getCategoryStats() { return categoryStats; }
    public void setCategoryStats(List<Map<String, Object>> categoryStats) { this.categoryStats = categoryStats; }
}
