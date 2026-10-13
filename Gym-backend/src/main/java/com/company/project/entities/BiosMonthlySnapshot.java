package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;

// Month-end member counts for one branch — written by BiosScheduler just after
// each month ends, because a member row only holds its current membership period
// and a past month's active count can't be recomputed exactly afterwards.
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "bios_monthly_snapshots")
public class BiosMonthlySnapshot extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    /** First day of the month the counts describe. */
    @Column(name = "month", nullable = false)
    private LocalDate month;

    @Column(name = "total_members", nullable = false)
    private Integer totalMembers;

    @Column(name = "active_members", nullable = false)
    private Integer activeMembers;

    @Column(name = "new_members", nullable = false)
    private Integer newMembers;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public LocalDate getMonth() { return month; }
    public void setMonth(LocalDate month) { this.month = month; }

    public Integer getTotalMembers() { return totalMembers; }
    public void setTotalMembers(Integer totalMembers) { this.totalMembers = totalMembers; }

    public Integer getActiveMembers() { return activeMembers; }
    public void setActiveMembers(Integer activeMembers) { this.activeMembers = activeMembers; }

    public Integer getNewMembers() { return newMembers; }
    public void setNewMembers(Integer newMembers) { this.newMembers = newMembers; }
}
