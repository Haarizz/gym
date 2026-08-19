package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

@Filter(name = "branchFilter", condition = "branch_id = :branchId OR branch_id IS NULL")
@Entity
@Table(name = "staff_attendance")
public class StaffAttendance extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private Staff staff;

    @Column(name = "clock_in_time", nullable = false)
    private LocalDateTime clockInTime;

    @Column(name = "clock_out_time")
    private LocalDateTime clockOutTime;

    // Calculated on clock-out: clockOutTime − clockInTime in minutes
    @Column(name = "total_minutes")
    private Integer totalMinutes;

    // working | completed
    @Column(nullable = false)
    private String status = "working";

    @Column(name = "device_id")
    private String deviceId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public StaffAttendance() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Staff getStaff() { return staff; }
    public void setStaff(Staff staff) { this.staff = staff; }

    public LocalDateTime getClockInTime() { return clockInTime; }
    public void setClockInTime(LocalDateTime clockInTime) { this.clockInTime = clockInTime; }

    public LocalDateTime getClockOutTime() { return clockOutTime; }
    public void setClockOutTime(LocalDateTime clockOutTime) { this.clockOutTime = clockOutTime; }

    public Integer getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(Integer totalMinutes) { this.totalMinutes = totalMinutes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @jakarta.persistence.PrePersist
    public void prePersistBranchId() {
        if (this.branchId == null) {
            Long activeBranch = com.company.project.security.BranchContextHolder.getActiveBranchId();
            if (activeBranch != null) {
                this.branchId = activeBranch;
            }
        }
    }
}
