package com.company.project.performance;

import com.company.project.performance.incentives.IncentiveBreakdown;
import com.company.project.performance.metric.Achieved;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.performance.settlement.SettlementView;
import com.company.project.performance.targets.Goal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.Map;

/**
 * The single answer to "what did this person do in this month" (plan §6): achieved figures per
 * metric, resolved goals, the incentive (estimated, or frozen once decided) and the settlement.
 */
public record PeriodResult(Long staffId, YearMonth period,
                           Map<Metric, Achieved> achieved,
                           Map<Goal.Key, Goal> goals,
                           IncentiveBreakdown incentive,
                           SettlementView settlement) {

    public Achieved achieved(Metric metric) {
        return achieved.getOrDefault(metric, Achieved.ZERO);
    }

    public long count(Metric metric) {
        return achieved(metric).count();
    }

    public BigDecimal amount(Metric metric) {
        return achieved(metric).amountOrZero();
    }

    public BigDecimal revenue() {
        return amount(Metric.REVENUE_TOTAL);
    }

    /** The goal on a metric and measure, or null when none applies. */
    public BigDecimal goal(Metric metric, Measure measure) {
        Goal g = goals.get(new Goal.Key(metric, measure));
        return g != null ? g.goal() : null;
    }

    /** Achieved ÷ goal × 100, rounded; null without a goal. */
    public Integer percent(Metric metric, Measure measure) {
        BigDecimal goal = goal(metric, measure);
        if (goal == null || goal.signum() <= 0) return null;
        return achieved(metric).value(measure).multiply(BigDecimal.valueOf(100)).divide(goal, 0, RoundingMode.HALF_UP).intValue();
    }

    /** What the person is (or will be) paid for the month: frozen amount once decided, else the estimate. */
    public BigDecimal commission() {
        return settlement != null ? settlement.amount() : incentive.total();
    }
}
