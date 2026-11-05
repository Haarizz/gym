package com.company.project.performance.incentives;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

/** Who a plan applies to: everyone in a role, or one staff member (which beats a role plan). */
@Entity
@Table(name = "incentive_plan_assignments")
public class IncentivePlanAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private IncentivePlan plan;

    @Column(name = "role", length = 100)
    private String role;

    @Column(name = "staff_id")
    private Long staffId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public IncentivePlan getPlan() { return plan; }
    public void setPlan(IncentivePlan plan) { this.plan = plan; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }
}
