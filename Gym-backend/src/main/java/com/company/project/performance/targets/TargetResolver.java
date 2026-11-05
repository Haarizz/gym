package com.company.project.performance.targets;

import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/**
 * Which goals apply (plan §5.1). Pure: works on the targets loaded for a month.
 *
 * For one scope (a staff member, a role in a branch, a branch) the month's own target wins,
 * else the latest repeating target that started earlier. A staff member's goal on a metric
 * comes from their own target, then their role's target in their branch, then none — per
 * metric, so a role target can supply the goals a personal target leaves out.
 */
public final class TargetResolver {

    private final Map<String, Target> byScope = new HashMap<>();

    public TargetResolver(Collection<Target> candidates, YearMonth month) {
        LocalDate start = month.atDay(1);
        Map<String, List<Target>> grouped = new HashMap<>();
        for (Target t : candidates) grouped.computeIfAbsent(scopeKey(t), k -> new ArrayList<>()).add(t);
        grouped.forEach((key, list) -> {
            Target exact = list.stream().filter(t -> start.equals(t.getPeriodStart())).findFirst().orElse(null);
            Target chosen = exact != null ? exact : list.stream()
                    .filter(t -> t.isRepeatMonthly() && t.getPeriodStart().isBefore(start))
                    .max(Comparator.comparing(Target::getPeriodStart))
                    .orElse(null);
            if (chosen != null) byScope.put(key, chosen);
        });
    }

    /** The staff member's goals: own target first, then their role's target in their branch. */
    public Map<Goal.Key, Goal> forStaff(Long staffId, String role, Long branchId) {
        Map<Goal.Key, Goal> out = new LinkedHashMap<>();
        add(out, byScope.get(staffKey(staffId)));
        if (role != null && !role.isBlank()) {
            add(out, byScope.get(roleKey(branchId, role)));
            if (branchId != null) add(out, byScope.get(roleKey(null, role)));
        }
        return out;
    }

    public Map<Goal.Key, Goal> forBranch(Long branchId) {
        Map<Goal.Key, Goal> out = new LinkedHashMap<>();
        add(out, byScope.get(branchKey(branchId)));
        return out;
    }

    public Optional<Target> staffTarget(Long staffId) {
        return Optional.ofNullable(byScope.get(staffKey(staffId)));
    }

    private static void add(Map<Goal.Key, Goal> out, Target t) {
        if (t == null) return;
        for (TargetLine l : t.getLines()) {
            Optional<Metric> metric = Metric.parse(l.getMetric());
            if (metric.isEmpty() || l.getGoal() == null || l.getGoal().signum() <= 0) continue;
            Measure measure;
            try {
                measure = Measure.parse(l.getMeasure());
            } catch (RuntimeException e) {
                continue;
            }
            Goal g = new Goal(metric.get(), measure, l.getGoal(), t.getScope(), t.getId());
            out.putIfAbsent(g.key(), g);
        }
    }

    static String scopeKey(Target t) {
        return switch (t.getScope()) {
            case Target.SCOPE_STAFF -> staffKey(t.getStaffId());
            case Target.SCOPE_ROLE -> roleKey(t.getBranchId(), t.getRole());
            default -> branchKey(t.getBranchId());
        };
    }

    private static String staffKey(Long staffId) {
        return "staff:" + staffId;
    }

    private static String roleKey(Long branchId, String role) {
        return "role:" + branchId + ":" + (role != null ? role.trim().toLowerCase() : "");
    }

    private static String branchKey(Long branchId) {
        return "branch:" + branchId;
    }
}
