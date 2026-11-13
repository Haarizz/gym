package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

/**
 * A face-recognition entry terminal (Heystar) reached through its HTTP middleware
 * (GymOS › Face Device Configuration, V127). Members of the device's branch are
 * pushed to it by FaceDeviceSyncService.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "face_devices")
public class FaceDevice extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(nullable = false)
    private String name;

    private String location;

    @Column(name = "middleware_url", nullable = false)
    private String middlewareUrl;

    @Column(name = "device_key", nullable = false)
    private String deviceKey;

    @Column(name = "device_secret", nullable = false)
    private String deviceSecret;

    @Column(name = "access_group", nullable = false)
    private int accessGroup = 1;

    @Column(name = "verify_style", nullable = false)
    private int verifyStyle = 1;

    @Column(name = "time_zone", nullable = false)
    private String timeZone = "Asia/Dubai";

    @Column(name = "photo_base_url")
    private String photoBaseUrl;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "auto_sync", nullable = false)
    private boolean autoSync = true;

    @Column(name = "last_test_at")
    private LocalDateTime lastTestAt;

    @Column(name = "last_test_ok")
    private Boolean lastTestOk;

    @Column(name = "last_test_message", columnDefinition = "TEXT")
    private String lastTestMessage;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(name = "last_sync_message", columnDefinition = "TEXT")
    private String lastSyncMessage;

    @Column(name = "report_emails", columnDefinition = "TEXT")
    private String reportEmails;

    @Column(name = "last_report_date")
    private java.time.LocalDate lastReportDate;

    @Column(name = "last_report_at")
    private LocalDateTime lastReportAt;

    @Column(name = "last_report_message", columnDefinition = "TEXT")
    private String lastReportMessage;

    @Column(name = "offline_since")
    private LocalDateTime offlineSince;

    @Column(name = "last_outage_start")
    private LocalDateTime lastOutageStart;

    @Column(name = "last_outage_end")
    private LocalDateTime lastOutageEnd;

    public String getReportEmails() { return reportEmails; }
    public void setReportEmails(String reportEmails) { this.reportEmails = reportEmails; }

    public java.time.LocalDate getLastReportDate() { return lastReportDate; }
    public void setLastReportDate(java.time.LocalDate lastReportDate) { this.lastReportDate = lastReportDate; }

    public LocalDateTime getLastReportAt() { return lastReportAt; }
    public void setLastReportAt(LocalDateTime lastReportAt) { this.lastReportAt = lastReportAt; }

    public String getLastReportMessage() { return lastReportMessage; }
    public void setLastReportMessage(String lastReportMessage) { this.lastReportMessage = lastReportMessage; }

    public LocalDateTime getOfflineSince() { return offlineSince; }
    public void setOfflineSince(LocalDateTime offlineSince) { this.offlineSince = offlineSince; }

    public LocalDateTime getLastOutageStart() { return lastOutageStart; }
    public void setLastOutageStart(LocalDateTime lastOutageStart) { this.lastOutageStart = lastOutageStart; }

    public LocalDateTime getLastOutageEnd() { return lastOutageEnd; }
    public void setLastOutageEnd(LocalDateTime lastOutageEnd) { this.lastOutageEnd = lastOutageEnd; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getMiddlewareUrl() { return middlewareUrl; }
    public void setMiddlewareUrl(String middlewareUrl) { this.middlewareUrl = middlewareUrl; }

    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }

    public String getDeviceSecret() { return deviceSecret; }
    public void setDeviceSecret(String deviceSecret) { this.deviceSecret = deviceSecret; }

    public int getAccessGroup() { return accessGroup; }
    public void setAccessGroup(int accessGroup) { this.accessGroup = accessGroup; }

    public int getVerifyStyle() { return verifyStyle; }
    public void setVerifyStyle(int verifyStyle) { this.verifyStyle = verifyStyle; }

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }

    public String getPhotoBaseUrl() { return photoBaseUrl; }
    public void setPhotoBaseUrl(String photoBaseUrl) { this.photoBaseUrl = photoBaseUrl; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public boolean isAutoSync() { return autoSync; }
    public void setAutoSync(boolean autoSync) { this.autoSync = autoSync; }

    public LocalDateTime getLastTestAt() { return lastTestAt; }
    public void setLastTestAt(LocalDateTime lastTestAt) { this.lastTestAt = lastTestAt; }

    public Boolean getLastTestOk() { return lastTestOk; }
    public void setLastTestOk(Boolean lastTestOk) { this.lastTestOk = lastTestOk; }

    public String getLastTestMessage() { return lastTestMessage; }
    public void setLastTestMessage(String lastTestMessage) { this.lastTestMessage = lastTestMessage; }

    public LocalDateTime getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(LocalDateTime lastSyncAt) { this.lastSyncAt = lastSyncAt; }

    public String getLastSyncMessage() { return lastSyncMessage; }
    public void setLastSyncMessage(String lastSyncMessage) { this.lastSyncMessage = lastSyncMessage; }
}
