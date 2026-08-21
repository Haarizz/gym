package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff_branches", uniqueConstraints = @UniqueConstraint(columnNames = {"staff_id", "branch_id"}))
public class StaffBranch implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public StaffBranch() {}

    public StaffBranch(Long staffId, Long branchId) {
        this.staffId = staffId;
        this.branchId = branchId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
