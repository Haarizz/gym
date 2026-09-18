package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * GymOS's "Module Management" — one row per platform module (COMMUNITY,
 * SALES_PURCHASES, FINANCIALS, ...) per gym, tracking whether it's enabled and
 * its operational status. Gym-wide, not branch-scoped (a gym doesn't turn a
 * module on for one branch and off for another), so this extends BaseEntity
 * without BranchAware/@Filter, matching Gym.java.
 */
@Entity
@Table(name = "platform_modules")
public class PlatformModule extends BaseEntity {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_MAINTENANCE = "MAINTENANCE";
    public static final String STATUS_INACTIVE = "INACTIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Matches a PermissionCatalog module key, e.g. "COMMUNITY", "FINANCIALS". */
    @Column(name = "module_key", nullable = false, unique = true)
    private String moduleKey;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String status = STATUS_ACTIVE;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "last_status_change_at")
    private LocalDateTime lastStatusChangeAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getModuleKey() { return moduleKey; }
    public void setModuleKey(String moduleKey) { this.moduleKey = moduleKey; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public LocalDateTime getLastStatusChangeAt() { return lastStatusChangeAt; }
    public void setLastStatusChangeAt(LocalDateTime lastStatusChangeAt) { this.lastStatusChangeAt = lastStatusChangeAt; }
}
