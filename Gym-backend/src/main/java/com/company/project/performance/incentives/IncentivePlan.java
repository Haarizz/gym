package com.company.project.performance.incentives;

import com.company.project.entities.BaseEntity;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * A versioned incentive plan (plan §5.2): commission lines and target bonuses for the roles or
 * people assigned to it, from effective_from (always the first of a month). Changing a rate
 * means a new version from a later month; months already decided keep the version they were
 * approved under (the settlement stores it).
 */
@Entity
@Table(name = "incentive_plans")
public class IncentivePlan extends BaseEntity {

    public static final String DRAFT = "draft";
    public static final String ACTIVE = "active";
    public static final String ARCHIVED = "archived";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    /** NULL = all branches. */
    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "status", nullable = false, length = 10)
    private String status = ACTIVE;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<IncentivePlanAssignment> assignments = new ArrayList<>();

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<IncentivePlanLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("thresholdPct")
    private List<IncentivePlanBonus> bonuses = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(LocalDate effectiveTo) { this.effectiveTo = effectiveTo; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public List<IncentivePlanAssignment> getAssignments() { return assignments; }
    public void setAssignments(List<IncentivePlanAssignment> assignments) { this.assignments = assignments; }
    public List<IncentivePlanLine> getLines() { return lines; }
    public void setLines(List<IncentivePlanLine> lines) { this.lines = lines; }
    public List<IncentivePlanBonus> getBonuses() { return bonuses; }
    public void setBonuses(List<IncentivePlanBonus> bonuses) { this.bonuses = bonuses; }
}
