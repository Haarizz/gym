package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

// One row per branch: the member check-in timing rules set from the Check In page.
// A branch with no row uses the defaults below.
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "check_in_settings")
public class CheckInSettings extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    // A member can't check themselves out sooner than this after checking in; staff may override.
    @Column(name = "min_visit_minutes", nullable = false)
    private Integer minVisitMinutes = 0;

    // Length of a break during the visit (Take Break in the member app); the member
    // stays checked in. 0 = Take Break off.
    @Column(name = "break_grace_minutes", nullable = false)
    private Integer breakGraceMinutes = 0;

    // The gap required between any check-out and the next check-in.
    @Column(name = "cooldown_minutes", nullable = false)
    private Integer cooldownMinutes = 120;

    public CheckInSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getMinVisitMinutes() { return minVisitMinutes; }
    public void setMinVisitMinutes(Integer minVisitMinutes) { this.minVisitMinutes = minVisitMinutes; }

    public Integer getBreakGraceMinutes() { return breakGraceMinutes; }
    public void setBreakGraceMinutes(Integer breakGraceMinutes) { this.breakGraceMinutes = breakGraceMinutes; }

    public Integer getCooldownMinutes() { return cooldownMinutes; }
    public void setCooldownMinutes(Integer cooldownMinutes) { this.cooldownMinutes = cooldownMinutes; }
}
