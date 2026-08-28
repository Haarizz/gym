package com.company.project.entities;

import jakarta.persistence.*;

import org.hibernate.annotations.Filter;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "plan_groups")
public class PlanGroup extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // Active / Inactive
    @Column(nullable = false)
    private String status = "Active";

    public PlanGroup() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
