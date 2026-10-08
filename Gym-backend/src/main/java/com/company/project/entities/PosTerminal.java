package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A registered POS device (BillBull PosTerminal). The browser keeps terminalCode; the device
 * fingerprint recognises it again if that is lost. status: PENDING, ACTIVE, MAINTENANCE, BLOCKED,
 * ARCHIVED or DECOMMISSIONED; online / offline is derived from lastHeartbeatAt.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_terminals")
public class PosTerminal extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "terminal_code", length = 40, nullable = false)
    private String terminalCode;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "counter_id")
    private Long counterId;

    @Column(name = "counter_name", length = 100)
    private String counterName;

    @Column(name = "device_fingerprint", length = 128)
    private String deviceFingerprint;

    @Column(name = "device_info", length = 500)
    private String deviceInfo;

    @Column(name = "operating_system", length = 100)
    private String operatingSystem;

    @Column(name = "browser", length = 100)
    private String browser;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "is_main", nullable = false)
    private Boolean isMain = false;

    @Column(name = "status", length = 20, nullable = false)
    private String status = "ACTIVE";

    @Column(name = "registered_by", length = 100)
    private String registeredBy;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private java.time.LocalDateTime approvedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "last_seen_at")
    private java.time.LocalDateTime lastSeenAt;

    @Column(name = "last_heartbeat_at")
    private java.time.LocalDateTime lastHeartbeatAt;

    @Column(name = "last_user", length = 100)
    private String lastUser;

    @Column(name = "current_session_id")
    private Long currentSessionId;

    /** Hardware profile (V81) — its receipt printer / drawer / scanner are this terminal's. */
    @Column(name = "hardware_profile_id")
    private Long hardwareProfileId;

    @Column(name = "status_reason", length = 500)
    private String statusReason;

    @Column(name = "archived_at")
    private java.time.LocalDateTime archivedAt;

    @Column(name = "decommissioned_at")
    private java.time.LocalDateTime decommissionedAt;

    public PosTerminal() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getTerminalCode() { return terminalCode; }
    public void setTerminalCode(String terminalCode) { this.terminalCode = terminalCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getCounterId() { return counterId; }
    public void setCounterId(Long counterId) { this.counterId = counterId; }

    public String getCounterName() { return counterName; }
    public void setCounterName(String counterName) { this.counterName = counterName; }

    public String getDeviceFingerprint() { return deviceFingerprint; }
    public void setDeviceFingerprint(String deviceFingerprint) { this.deviceFingerprint = deviceFingerprint; }

    public String getDeviceInfo() { return deviceInfo; }
    public void setDeviceInfo(String deviceInfo) { this.deviceInfo = deviceInfo; }

    public String getOperatingSystem() { return operatingSystem; }
    public void setOperatingSystem(String operatingSystem) { this.operatingSystem = operatingSystem; }

    public String getBrowser() { return browser; }
    public void setBrowser(String browser) { this.browser = browser; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public Boolean getIsMain() { return isMain; }
    public void setIsMain(Boolean isMain) { this.isMain = isMain; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRegisteredBy() { return registeredBy; }
    public void setRegisteredBy(String registeredBy) { this.registeredBy = registeredBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public java.time.LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(java.time.LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public java.time.LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(java.time.LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }

    public java.time.LocalDateTime getLastHeartbeatAt() { return lastHeartbeatAt; }
    public void setLastHeartbeatAt(java.time.LocalDateTime lastHeartbeatAt) { this.lastHeartbeatAt = lastHeartbeatAt; }

    public String getLastUser() { return lastUser; }
    public void setLastUser(String lastUser) { this.lastUser = lastUser; }

    public Long getCurrentSessionId() { return currentSessionId; }
    public void setCurrentSessionId(Long currentSessionId) { this.currentSessionId = currentSessionId; }
    public Long getHardwareProfileId() { return hardwareProfileId; }
    public void setHardwareProfileId(Long hardwareProfileId) { this.hardwareProfileId = hardwareProfileId; }

    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }

    public java.time.LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(java.time.LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public java.time.LocalDateTime getDecommissionedAt() { return decommissionedAt; }
    public void setDecommissionedAt(java.time.LocalDateTime decommissionedAt) { this.decommissionedAt = decommissionedAt; }
}
