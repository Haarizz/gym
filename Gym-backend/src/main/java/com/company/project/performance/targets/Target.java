package com.company.project.performance.targets;

import com.company.project.entities.BaseEntity;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Goals for one month (plan §5.1), for a staff member, a role in a branch, or a whole branch.
 * A repeating target also applies to every later month that has no target of its own (this is
 * what the old employees.monthly_target was).
 *
 * Not BranchAware: branch_id is part of the target's identity and readers resolve it explicitly.
 */
@Entity
@Table(name = "targets")
public class Target extends BaseEntity {

    public static final String SCOPE_STAFF = "staff";
    public static final String SCOPE_ROLE = "role";
    public static final String SCOPE_BRANCH = "branch";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "scope", nullable = false, length = 10)
    private String scope;

    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "role", length = 100)
    private String role;

    @Column(name = "period_type", nullable = false, length = 10)
    private String periodType = "month";

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "repeat_monthly", nullable = false)
    private boolean repeatMonthly;

    @OneToMany(mappedBy = "target", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("id")
    private List<TargetLine> lines = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getPeriodType() { return periodType; }
    public void setPeriodType(String periodType) { this.periodType = periodType; }
    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }
    public boolean isRepeatMonthly() { return repeatMonthly; }
    public void setRepeatMonthly(boolean repeatMonthly) { this.repeatMonthly = repeatMonthly; }
    public List<TargetLine> getLines() { return lines; }
    public void setLines(List<TargetLine> lines) { this.lines = lines; }
}
