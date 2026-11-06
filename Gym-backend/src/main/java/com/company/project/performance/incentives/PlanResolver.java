package com.company.project.performance.incentives;

import java.util.Collection;
import java.util.Comparator;
import java.util.Optional;

/**
 * Which plan a staff member earns under in a month (plan §5.2). Pure. A plan assigned to the
 * person beats a plan for their role; a branch plan beats an all-branches plan; then the latest
 * effective_from wins. No match = no plan = nothing earned (there is no implicit rate).
 */
public final class PlanResolver {

    private PlanResolver() {}

    public static Optional<IncentivePlan> resolve(Collection<IncentivePlan> inForce, Long staffId, String role, Long branchId) {
        return inForce.stream()
                .filter(p -> p.getBranchId() == null || p.getBranchId().equals(branchId))
                .filter(p -> rank(p, staffId, role) > 0)
                .max(Comparator.<IncentivePlan>comparingInt(p -> rank(p, staffId, role))
                        .thenComparing(p -> p.getBranchId() != null)
                        .thenComparing(IncentivePlan::getEffectiveFrom)
                        .thenComparing(IncentivePlan::getId, Comparator.nullsFirst(Comparator.naturalOrder())));
    }

    /** 2 = assigned to this person, 1 = assigned to their role, 0 = doesn't apply. */
    static int rank(IncentivePlan p, Long staffId, String role) {
        int best = 0;
        for (IncentivePlanAssignment a : p.getAssignments()) {
            if (a.getStaffId() != null) {
                if (a.getStaffId().equals(staffId)) return 2;
            } else if (a.getRole() != null && role != null && a.getRole().trim().equalsIgnoreCase(role.trim())) {
                best = 1;
            }
        }
        return best;
    }
}
