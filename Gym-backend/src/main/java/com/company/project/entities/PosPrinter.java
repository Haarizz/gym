package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A receipt printer configured for the POS. connectionType: BROWSER (system print dialog),
 * AGENT (USB/Windows queue via the local POS print agent) or NETWORK (raw ESC/POS to IP:port,
 * relayed by the backend so it works from any device).
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_printers")
public class PosPrinter extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "connection_type", length = 20, nullable = false)
    private String connectionType = "BROWSER";

    @Column(name = "system_printer_name")
    private String systemPrinterName;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "port_number")
    private Integer portNumber;

    @Column(name = "paper_size", length = 10, nullable = false)
    private String paperSize = "80mm";

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "open_drawer", nullable = false)
    private Boolean openDrawer = false;

    @Column(name = "auto_cut", nullable = false)
    private Boolean autoCut = true;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @Column(name = "last_test_at")
    private java.time.LocalDateTime lastTestAt;

    @Column(name = "last_test_result", length = 500)
    private String lastTestResult;

    public PosPrinter() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getConnectionType() { return connectionType; }
    public void setConnectionType(String connectionType) { this.connectionType = connectionType; }

    public String getSystemPrinterName() { return systemPrinterName; }
    public void setSystemPrinterName(String systemPrinterName) { this.systemPrinterName = systemPrinterName; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public Integer getPortNumber() { return portNumber; }
    public void setPortNumber(Integer portNumber) { this.portNumber = portNumber; }

    public String getPaperSize() { return paperSize; }
    public void setPaperSize(String paperSize) { this.paperSize = paperSize; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }

    public Boolean getOpenDrawer() { return openDrawer; }
    public void setOpenDrawer(Boolean openDrawer) { this.openDrawer = openDrawer; }

    public Boolean getAutoCut() { return autoCut; }
    public void setAutoCut(Boolean autoCut) { this.autoCut = autoCut; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public java.time.LocalDateTime getLastTestAt() { return lastTestAt; }
    public void setLastTestAt(java.time.LocalDateTime lastTestAt) { this.lastTestAt = lastTestAt; }

    public String getLastTestResult() { return lastTestResult; }
    public void setLastTestResult(String lastTestResult) { this.lastTestResult = lastTestResult; }
}
