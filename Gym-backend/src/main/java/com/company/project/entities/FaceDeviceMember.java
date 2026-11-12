package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** What GymBios last pushed for one member to one face device (V127). */
@Entity
@Table(name = "face_device_members")
public class FaceDeviceMember {

    /** Person + photo on the device: the member can walk in. */
    public static final String ENROLLED = "ENROLLED";
    /** Allowed in, but there is no photo yet, so the device can't recognise them. */
    public static final String NO_PHOTO = "NO_PHOTO";
    /** Was on the device; face removed because they may no longer enter. */
    public static final String REMOVED = "REMOVED";
    /** May not enter and was never pushed — nothing on the device. */
    public static final String NOT_ON_DEVICE = "NOT_ON_DEVICE";
    /** The device rejected the push (bad photo, no face found…); retried when the member changes. */
    public static final String FAILED = "FAILED";
    /** The device or middleware was unreachable; retried on the next run. */
    public static final String RETRY = "RETRY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "person_sn", nullable = false)
    private String personSn;

    @Column(nullable = false)
    private String state;

    private String fingerprint;

    @Column(name = "last_message", columnDefinition = "TEXT")
    private String lastMessage;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    @Column(name = "last_success_at")
    private LocalDateTime lastSuccessAt;

    /** True when the device holds a person record for this member. */
    public boolean isOnDevice() {
        return ENROLLED.equals(state) || NO_PHOTO.equals(state) || FAILED.equals(state) || RETRY.equals(state);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getPersonSn() { return personSn; }
    public void setPersonSn(String personSn) { this.personSn = personSn; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getFingerprint() { return fingerprint; }
    public void setFingerprint(String fingerprint) { this.fingerprint = fingerprint; }

    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }

    public LocalDateTime getLastAttemptAt() { return lastAttemptAt; }
    public void setLastAttemptAt(LocalDateTime lastAttemptAt) { this.lastAttemptAt = lastAttemptAt; }

    public LocalDateTime getLastSuccessAt() { return lastSuccessAt; }
    public void setLastSuccessAt(LocalDateTime lastSuccessAt) { this.lastSuccessAt = lastSuccessAt; }
}
