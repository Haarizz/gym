package com.company.project.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * An unverified mobile registration: submitted form data, a hashed OTP, and a
 * hashed opaque handle (registrationTokenHash) the client uses to verify/resend/
 * check status. No {@link User} row exists for this registration until OTP
 * verification succeeds — see the email-OTP-verification architecture plan for
 * why this is the whole security boundary (no account, no JWT, nothing to
 * authenticate with until verified).
 */
@Entity
@Table(name = "mobile_pending_registrations")
public class MobilePendingRegistration extends BaseEntity {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_CONSUMED = "CONSUMED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "registration_token_hash", nullable = false, unique = true)
    private String registrationTokenHash;

    @Column(name = "email_normalized", nullable = false, unique = true)
    private String emailNormalized;

    @Column(name = "username_normalized", nullable = false, unique = true)
    private String usernameNormalized;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "otp_hash")
    private String otpHash;

    @Column(name = "otp_expires_at", nullable = false)
    private LocalDateTime otpExpiresAt;

    @Column(name = "otp_attempt_count", nullable = false)
    private int otpAttemptCount = 0;

    @Column(name = "total_attempt_count", nullable = false)
    private int totalAttemptCount = 0;

    @Column(name = "resend_count", nullable = false)
    private int resendCount = 0;

    @Column(name = "last_otp_sent_at")
    private LocalDateTime lastOtpSentAt;

    @Column(name = "status", nullable = false)
    private String status = STATUS_PENDING;

    @Column(name = "linked_user_id")
    private Long linkedUserId;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRegistrationTokenHash() { return registrationTokenHash; }
    public void setRegistrationTokenHash(String registrationTokenHash) { this.registrationTokenHash = registrationTokenHash; }

    public String getEmailNormalized() { return emailNormalized; }
    public void setEmailNormalized(String emailNormalized) { this.emailNormalized = emailNormalized; }

    public String getUsernameNormalized() { return usernameNormalized; }
    public void setUsernameNormalized(String usernameNormalized) { this.usernameNormalized = usernameNormalized; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getOtpHash() { return otpHash; }
    public void setOtpHash(String otpHash) { this.otpHash = otpHash; }

    public LocalDateTime getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(LocalDateTime otpExpiresAt) { this.otpExpiresAt = otpExpiresAt; }

    public int getOtpAttemptCount() { return otpAttemptCount; }
    public void setOtpAttemptCount(int otpAttemptCount) { this.otpAttemptCount = otpAttemptCount; }

    public int getTotalAttemptCount() { return totalAttemptCount; }
    public void setTotalAttemptCount(int totalAttemptCount) { this.totalAttemptCount = totalAttemptCount; }

    public int getResendCount() { return resendCount; }
    public void setResendCount(int resendCount) { this.resendCount = resendCount; }

    public LocalDateTime getLastOtpSentAt() { return lastOtpSentAt; }
    public void setLastOtpSentAt(LocalDateTime lastOtpSentAt) { this.lastOtpSentAt = lastOtpSentAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getLinkedUserId() { return linkedUserId; }
    public void setLinkedUserId(Long linkedUserId) { this.linkedUserId = linkedUserId; }

    public LocalDateTime getConsumedAt() { return consumedAt; }
    public void setConsumedAt(LocalDateTime consumedAt) { this.consumedAt = consumedAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
