package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "training_streams")
public class TrainingStream extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instructor_id")
    private Staff instructor;

    // HIIT | Yoga | Strength | Cardio | Pilates | Dance
    @Column(nullable = false)
    private String category;

    // Duration in minutes
    @Column(nullable = false)
    private Integer duration;

    // Beginner | Intermediate | Advanced
    private String difficulty;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    // current live viewer/participant count
    @Column(nullable = false)
    private Integer participants = 0;

    // Scheduled | Live | Ended | Cancelled
    @Column(nullable = false)
    private String status = "Scheduled";

    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    @Column(nullable = false)
    private Integer views = 0;

    @Column(nullable = false)
    private Integer likes = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "stream_url")
    private String streamUrl;

    // live | recording | hybrid
    @Column(name = "stream_type")
    private String streamType = "live";

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    public TrainingStream() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Staff getInstructor() { return instructor; }
    public void setInstructor(Staff instructor) { this.instructor = instructor; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public Integer getMaxParticipants() { return maxParticipants; }
    public void setMaxParticipants(Integer maxParticipants) { this.maxParticipants = maxParticipants; }

    public Integer getParticipants() { return participants; }
    public void setParticipants(Integer participants) { this.participants = participants; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(LocalDateTime scheduledTime) { this.scheduledTime = scheduledTime; }

    public Integer getViews() { return views; }
    public void setViews(Integer views) { this.views = views; }

    public Integer getLikes() { return likes; }
    public void setLikes(Integer likes) { this.likes = likes; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }

    public String getStreamType() { return streamType; }
    public void setStreamType(String streamType) { this.streamType = streamType; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
}
