package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A piece of POS hardware (BillBull PosDevice). deviceType: PRINTER, SCANNER, CASH_DRAWER, CARD_TERMINAL,
 * CUSTOMER_DISPLAY, SCALE or GENERIC; a PRINTER mirrors a pos_printers row and a CASH_DRAWER names the
 * printer it is wired to (printerId). health: UNKNOWN, HEALTHY, DEGRADED or OFFLINE.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_devices")
public class PosDevice extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "device_code", length = 40, nullable = false)
    private String deviceCode;

    @Column(name = "name", length = 120, nullable = false)
    private String name;

    @Column(name = "device_type", length = 30, nullable = false)
    private String deviceType;

    @Column(name = "connection_type", length = 30)
    private String connectionType;

    @Column(name = "address", length = 200)
    private String address;

    @Column(name = "terminal_id")
    private Long terminalId;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    @Column(name = "printer_id")
    private Long printerId;

    @Column(name = "status", length = 20, nullable = false)
    private String status = "ACTIVE";

    @Column(name = "health", length = 20, nullable = false)
    private String health = "UNKNOWN";

    @Column(name = "health_message", length = 500)
    private String healthMessage;

    @Column(name = "last_health_at")
    private java.time.LocalDateTime lastHealthAt;

    @Column(name = "last_used_at")
    private java.time.LocalDateTime lastUsedAt;

    @Column(name = "config_json", columnDefinition = "TEXT")
    private String configJson;

    @Column(name = "notes", length = 500)
    private String notes;

    public PosDevice() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getDeviceCode() { return deviceCode; }
    public void setDeviceCode(String deviceCode) { this.deviceCode = deviceCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getConnectionType() { return connectionType; }
    public void setConnectionType(String connectionType) { this.connectionType = connectionType; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Long getTerminalId() { return terminalId; }
    public void setTerminalId(Long terminalId) { this.terminalId = terminalId; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }

    public Long getPrinterId() { return printerId; }
    public void setPrinterId(Long printerId) { this.printerId = printerId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getHealth() { return health; }
    public void setHealth(String health) { this.health = health; }

    public String getHealthMessage() { return healthMessage; }
    public void setHealthMessage(String healthMessage) { this.healthMessage = healthMessage; }

    public java.time.LocalDateTime getLastHealthAt() { return lastHealthAt; }
    public void setLastHealthAt(java.time.LocalDateTime lastHealthAt) { this.lastHealthAt = lastHealthAt; }

    public java.time.LocalDateTime getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(java.time.LocalDateTime lastUsedAt) { this.lastUsedAt = lastUsedAt; }

    public String getConfigJson() { return configJson; }
    public void setConfigJson(String configJson) { this.configJson = configJson; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
