package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * GymOS's "API Integration" widget: one row per third-party integration the
 * gym can connect (payment gateway, SMS, email, ...), replacing gymos.tsx's
 * hardcoded apiIntegrations sample data. Gym-wide, not branch-scoped, so this
 * extends BaseEntity directly, matching PlatformModule. Status/successRate/
 * lastSyncAt are admin- or system-updated — there is no external monitoring
 * layer that probes these providers live.
 */
@Entity
@Table(name = "integrations")
public class Integration extends BaseEntity {

    public static final String STATUS_CONNECTED = "CONNECTED";
    public static final String STATUS_ERROR = "ERROR";
    public static final String STATUS_DISCONNECTED = "DISCONNECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "integration_key", nullable = false, unique = true)
    private String integrationKey;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String status = STATUS_DISCONNECTED;

    @Column(name = "success_rate")
    private BigDecimal successRate;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIntegrationKey() { return integrationKey; }
    public void setIntegrationKey(String integrationKey) { this.integrationKey = integrationKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getSuccessRate() { return successRate; }
    public void setSuccessRate(BigDecimal successRate) { this.successRate = successRate; }

    public LocalDateTime getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(LocalDateTime lastSyncAt) { this.lastSyncAt = lastSyncAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
