package com.company.project.performance.targets;

import com.company.project.performance.incentives.IncentivePlan;
import com.company.project.performance.incentives.IncentivePlanAssignment;
import com.company.project.performance.incentives.PlanResolver;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Which goals and which plan apply to a person in a month. */
class ResolutionTest {

    private static final YearMonth NOV = YearMonth.of(2026, 11);

    private static Target target(String scope, Long staffId, String role, Long branch, YearMonth month, boolean repeat,
                                 Metric metric, String measure, String goal) {
        Target t = new Target();
        t.setId((long) (Math.random() * 1_000_000));
        t.setScope(scope);
        t.setStaffId(staffId);
        t.setRole(role);
        t.setBranchId(branch);
        t.setPeriodStart(month.atDay(1));
        t.setPeriodEnd(month.atEndOfMonth());
        t.setRepeatMonthly(repeat);
        TargetLine l = new TargetLine();
        l.setMetric(metric.name());
        l.setMeasure(measure);
        l.setGoal(new BigDecimal(goal));
        t.getLines().add(l);
        return t;
    }

    @Test
    void ownTargetThenRoleTargetPerMetric() {
        Target own = target("staff", 5L, null, 1L, NOV, false, Metric.REVENUE_TOTAL, "amount", "80000");
        Target role = target("role", null, "Sales", 1L, NOV, false, Metric.LEAD_CONVERSION, "count", "12");
        Target roleRevenue = target("role", null, "Sales", 2L, NOV, false, Metric.REVENUE_TOTAL, "amount", "1");
        TargetResolver r = new TargetResolver(List.of(own, role, roleRevenue), NOV);

        Map<Goal.Key, Goal> goals = r.forStaff(5L, "sales", 1L);
        assertEquals(0, new BigDecimal("80000").compareTo(goals.get(new Goal.Key(Metric.REVENUE_TOTAL, Measure.AMOUNT)).goal()));
        assertEquals("staff", goals.get(new Goal.Key(Metric.REVENUE_TOTAL, Measure.AMOUNT)).source());
        assertEquals(0, new BigDecimal("12").compareTo(goals.get(new Goal.Key(Metric.LEAD_CONVERSION, Measure.COUNT)).goal()));
        assertEquals("role", goals.get(new Goal.Key(Metric.LEAD_CONVERSION, Measure.COUNT)).source());
    }

    @Test
    void repeatingTargetFillsLaterMonthsUntilReplaced() {
        Target standing = target("staff", 5L, null, 1L, YearMonth.of(2000, 1), true, Metric.REVENUE_TOTAL, "amount", "50000");
        Target december = target("staff", 5L, null, 1L, YearMonth.of(2026, 12), false, Metric.REVENUE_TOTAL, "amount", "90000");

        Map<Goal.Key, Goal> nov = new TargetResolver(List.of(standing), NOV).forStaff(5L, null, 1L);
        assertEquals(0, new BigDecimal("50000").compareTo(nov.values().iterator().next().goal()));

        Map<Goal.Key, Goal> dec = new TargetResolver(List.of(standing, december), YearMonth.of(2026, 12)).forStaff(5L, null, 1L);
        assertEquals(0, new BigDecimal("90000").compareTo(dec.values().iterator().next().goal()));
    }

    @Test
    void nothingAppliesWithoutATarget() {
        assertTrue(new TargetResolver(List.of(), NOV).forStaff(5L, "Sales", 1L).isEmpty());
    }

    private static IncentivePlan plan(long id, Long branch, LocalDate from, String role, Long staffId) {
        IncentivePlan p = new IncentivePlan();
        p.setId(id);
        p.setName("p" + id);
        p.setBranchId(branch);
        p.setEffectiveFrom(from);
        IncentivePlanAssignment a = new IncentivePlanAssignment();
        a.setRole(role);
        a.setStaffId(staffId);
        p.getAssignments().add(a);
        return p;
    }

    @Test
    void planPrecedence() {
        IncentivePlan roleAll = plan(1, null, LocalDate.of(2000, 1, 1), "Trainer", null);
        IncentivePlan roleBranch = plan(2, 1L, LocalDate.of(2000, 1, 1), "Trainer", null);
        IncentivePlan roleNewer = plan(3, null, LocalDate.of(2026, 6, 1), "Trainer", null);
        IncentivePlan personal = plan(4, null, LocalDate.of(2000, 1, 1), null, 5L);
        IncentivePlan otherBranch = plan(5, 2L, LocalDate.of(2026, 10, 1), "Trainer", null);

        assertEquals(4L, PlanResolver.resolve(List.of(roleAll, roleBranch, roleNewer, personal), 5L, "Trainer", 1L).orElseThrow().getId());
        assertEquals(2L, PlanResolver.resolve(List.of(roleAll, roleBranch, roleNewer, otherBranch), 5L, "trainer", 1L).orElseThrow().getId());
        assertEquals(3L, PlanResolver.resolve(List.of(roleAll, roleNewer, otherBranch), 5L, "Trainer", 1L).orElseThrow().getId());
        assertTrue(PlanResolver.resolve(List.of(roleAll), 5L, "Front desk", 1L).isEmpty());
    }
}
