package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * An Expo push token registered by a member's device. One row per device token;
 * re-registering the same token (e.g. a different member signs in on that device)
 * moves it to the new member.
 */
@Entity
@Table(name = "mobile_push_tokens")
public class MobilePushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK to members.id (not enforced, same as Receipt.memberDbId)
    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "expo_push_token", nullable = false, unique = true)
    private String expoPushToken;

    // "ios" | "android"
    @Column(name = "platform")
    private String platform;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getExpoPushToken() { return expoPushToken; }
    public void setExpoPushToken(String expoPushToken) { this.expoPushToken = expoPushToken; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
