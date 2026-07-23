package com.company.project.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public class TrainingStreamRequestDTO {

    private String title;

    @JsonProperty("instructor_id")
    private Long instructorId;

    private String category;

    private Integer duration;

    private String difficulty;

    @JsonProperty("max_participants")
    private Integer maxParticipants;

    private String status;

    @JsonProperty("scheduled_time")
    private LocalDateTime scheduledTime;

    private String description;

    @JsonProperty("stream_url")
    private String streamUrl;

    @JsonProperty("stream_type")
    private String streamType;

    @JsonProperty("thumbnail_url")
    private String thumbnailUrl;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Long getInstructorId() { return instructorId; }
    public void setInstructorId(Long instructorId) { this.instructorId = instructorId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public Integer getMaxParticipants() { return maxParticipants; }
    public void setMaxParticipants(Integer maxParticipants) { this.maxParticipants = maxParticipants; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(LocalDateTime scheduledTime) { this.scheduledTime = scheduledTime; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }

    public String getStreamType() { return streamType; }
    public void setStreamType(String streamType) { this.streamType = streamType; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
}
