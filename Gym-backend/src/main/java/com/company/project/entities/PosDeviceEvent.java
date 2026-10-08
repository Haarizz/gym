package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * One entry in a POS device's event log (BillBull PosDeviceEventLog).
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_device_events")
public class PosDeviceEvent extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "device_id")
    private Long deviceId;

    @Column(name = "event_type", length = 40, nullable = false)
    private String eventType;

    @Column(name = "result", length = 20, nullable = false)
    private String result = "INFO";

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    public PosDeviceEvent() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
}
