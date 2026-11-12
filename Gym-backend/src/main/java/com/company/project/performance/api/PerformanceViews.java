package com.company.project.performance.api;

import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.incentives.*;
import com.company.project.performance.metric.Achieved;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.performance.settlement.SettlementView;
import com.company.project.performance.targets.Goal;
import com.company.project.performance.targets.Target;
import com.company.project.performance.targets.TargetLine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/** JSON shapes of the performance API (snake_case keys, as everywhere else in the API). */
public final class PerformanceViews {

    private PerformanceViews() {}

    public static List<Map<String, Object>> metrics() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Metric m : Metric.values()) {
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("code", m.name());
            x.put("label", m.label());
            x.put("audience", m.audience().name().toLowerCase());
            x.put("has_count", m.hasCount());
            x.put("has_amount", m.hasAmount());
            x.put("virtual", m.isVirtual());
            out.add(x);
        }
        return out;
    }

    public static Map<String, Object> achieved(Map<Metric, Achieved> achieved) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Metric m : Metric.values()) {
            Achieved a = achieved.getOrDefault(m, Achieved.ZERO);
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("count", m.hasCount() ? a.count() : null);
            x.put("amount", m.hasAmount() ? a.amountOrZero().setScale(2, RoundingMode.HALF_UP) : null);
            out.put(m.name(), x);
        }
        return out;
    }

    public static List<Map<String, Object>> goals(Map<Goal.Key, Goal> goals, Map<Metric, Achieved> achieved) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Goal g : goals.values()) {
            BigDecimal value = achieved.getOrDefault(g.metric(), Achieved.ZERO).value(g.measure());
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("metric", g.metric().name());
            x.put("label", g.metric().label());
            x.put("measure", g.measure().code());
            x.put("goal", g.goal());
            x.put("achieved", value);
            x.put("percent", g.goal().signum() > 0
                    ? value.multiply(BigDecimal.valueOf(100)).divide(g.goal(), 0, RoundingMode.HALF_UP).intValue() : null);
            x.put("source", g.source());
            x.put("target_id", g.targetId());
            out.add(x);
        }
        return out;
    }

    public static Map<String, Object> settlement(SettlementView s) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("status", s.status());
        x.put("amount", s.amount());
        x.put("computed_amount", s.computedAmount());
        x.put("adjustment_amount", s.adjustmentAmount());
        x.put("note", s.note());
        x.put("reviewed_by", s.reviewedBy());
        x.put("reviewed_at", s.reviewedAt() != null ? s.reviewedAt().toString() : null);
        x.put("paid_at", s.paidAt() != null ? s.paidAt().toString() : null);
        x.put("payroll_run_id", s.payrollRunId());
        x.put("plan_id", s.planId());
        return x;
    }

    public static Map<String, Object> incentive(IncentiveBreakdown b) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("plan_id", b.planId());
        x.put("plan_name", b.planName());
        x.put("has_plan", b.hasPlan());
        x.put("legacy", b.legacy());
        x.put("total", b.total());
        List<Map<String, Object>> lines = new ArrayList<>();
        for (IncentiveBreakdown.LineResult l : b.lines()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("line_id", l.lineId());
            m.put("metric", l.metric());
            m.put("label", l.label());
            m.put("basis", l.basis());
            m.put("rate", l.rate());
            m.put("units", l.units());
            m.put("base", l.base());
            m.put("earned", l.earned());
            m.put("min_units", l.minUnits());
            m.put("cap_amount", l.capAmount());
            m.put("below_minimum", l.belowMinimum());
            m.put("capped", l.capped());
            lines.add(m);
        }
        x.put("lines", lines);
        List<Map<String, Object>> bonuses = new ArrayList<>();
        for (IncentiveBreakdown.BonusResult r : b.bonuses()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bonus_id", r.bonusId());
            m.put("metric", r.metric());
            m.put("label", r.label());
            m.put("threshold_pct", r.thresholdPct());
            m.put("attainment_pct", r.attainmentPct());
            m.put("reward_type", r.rewardType());
            m.put("reward_value", r.rewardValue());
            m.put("reached", r.reached());
            m.put("condition_met", r.conditionMet());
            m.put("earned", r.earned());
            bonuses.add(m);
        }
        x.put("bonuses", bonuses);
        return x;
    }

    public static Map<String, Object> period(PeriodResult r) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("period", r.period().toString());
        x.put("achieved", achieved(r.achieved()));
        x.put("goals", goals(r.goals(), r.achieved()));
        x.put("incentive", incentive(r.incentive()));
        x.put("settlement", settlement(r.settlement()));
        x.put("commission", r.commission());
        return x;
    }

    public static Map<String, Object> branch(PerformanceEngine.BranchResult r) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("branch_id", r.branchId());
        x.put("period", r.period().toString());
        x.put("achieved", achieved(r.achieved()));
        x.put("goals", goals(r.goals(), r.achieved()));
        return x;
    }

    public static Map<String, Object> target(Target t) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("id", t.getId());
        x.put("scope", t.getScope());
        x.put("staff_id", t.getStaffId());
        x.put("role", t.getRole());
        x.put("branch_id", t.getBranchId());
        x.put("period", t.getPeriodStart().toString().substring(0, 7));
        x.put("repeat_monthly", t.isRepeatMonthly());
        List<Map<String, Object>> lines = new ArrayList<>();
        for (TargetLine l : t.getLines()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("metric", l.getMetric());
            m.put("measure", l.getMeasure());
            m.put("goal", l.getGoal());
            lines.add(m);
        }
        x.put("lines", lines);
        return x;
    }

    public static Map<String, Object> plan(IncentivePlan p, long settledMonths) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("id", p.getId());
        x.put("name", p.getName());
        x.put("branch_id", p.getBranchId());
        x.put("effective_from", p.getEffectiveFrom().toString().substring(0, 7));
        x.put("effective_to", p.getEffectiveTo() != null ? p.getEffectiveTo().toString() : null);
        x.put("status", p.getStatus());
        x.put("settled_months", settledMonths);
        x.put("assignments", p.getAssignments().stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("role", a.getRole());
            m.put("staff_id", a.getStaffId());
            return m;
        }).toList());
        x.put("lines", p.getLines().stream().map(l -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.getId());
            m.put("metric", l.getMetric());
            m.put("basis", l.getBasis());
            m.put("rate", l.getRate());
            m.put("min_units", l.getMinUnits());
            m.put("cap_amount", l.getCapAmount());
            return m;
        }).toList());
        x.put("bonuses", p.getBonuses().stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("metric", b.getMetric());
            m.put("threshold_pct", b.getThresholdPct());
            m.put("reward_type", b.getRewardType());
            m.put("reward_value", b.getRewardValue());
            m.put("condition_metric", b.getConditionMetric());
            m.put("condition_min", b.getConditionMin());
            return m;
        }).toList());
        return x;
    }

    /** Human-readable plan lines for the mobile "commission structure" card. */
    public static List<String[]> structure(IncentivePlan p) {
        List<String[]> out = new ArrayList<>();
        if (p == null) return out;
        for (IncentivePlanLine l : p.getLines()) {
            Metric m = Metric.parse(l.getMetric()).orElse(null);
            if (m == null) continue;
            String value = IncentivePlanLine.PERCENT_OF_AMOUNT.equals(l.getBasis())
                    ? plain(l.getRate()) + "%"
                    : plain(l.getRate()) + " per " + unit(m);
            if (l.getMinUnits() != null) value += " (from " + l.getMinUnits() + ")";
            if (l.getCapAmount() != null) value += ", max " + plain(l.getCapAmount());
            out.add(new String[]{m.name(), m.label(), value});
        }
        for (IncentivePlanBonus b : p.getBonuses()) {
            Metric m = Metric.parse(b.getMetric()).orElse(null);
            if (m == null) continue;
            String reward = IncentivePlanBonus.PERCENT_OF_METRIC_AMOUNT.equals(b.getRewardType())
                    ? "+" + plain(b.getRewardValue()) + "%"
                    : "+" + plain(b.getRewardValue());
            out.add(new String[]{"TARGET_BONUS", "Reach " + plain(b.getThresholdPct()) + "% of " + m.label().toLowerCase() + " target", reward});
        }
        return out;
    }

    public static String unit(Metric m) {
        return switch (m) {
            case MEMBER_ADMISSION -> "admission";
            case LEAD_CONVERSION -> "conversion";
            case POS_SALE -> "sale";
            case PT_SESSION_DELIVERED -> "session";
            case CLASS_TAUGHT -> "class";
            case CLASS_ATTENDEE -> "attendee";
            case PT_SALE -> "sale";
            case PT_REVENUE -> "unit";
            case REVENUE_TOTAL -> "unit";
        };
    }

    public static String plain(BigDecimal v) {
        return v == null ? "0" : v.stripTrailingZeros().toPlainString();
    }

    public static Measure measureOf(String code) {
        return Measure.parse(code);
    }
}
