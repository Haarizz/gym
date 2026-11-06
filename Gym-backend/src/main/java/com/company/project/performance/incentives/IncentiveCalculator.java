package com.company.project.performance.incentives;

import com.company.project.performance.metric.Achieved;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.performance.targets.Goal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * The one place commission and bonuses are calculated (plan §6). Pure: plan + what was achieved
 * + the goals → breakdown. Everything else (web, payroll, mobile) reads its result.
 *
 * Lines: percent_of_amount pays rate % of the metric's money; fixed_per_unit pays rate per unit.
 * A line with min_units pays nothing until that many units are reached, then pays on all of
 * them; cap_amount limits what the line pays in a month.
 *
 * Bonuses: per metric, the highest threshold reached (with its condition met) pays; tiers
 * don't stack. Attainment is measured against the person's goal on the metric — money when the
 * metric has a money goal, else count. No goal, no bonus.
 *
 * The month's total never goes below zero: a clawback larger than the month's earnings is not
 * carried into later months.
 */
public final class IncentiveCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private IncentiveCalculator() {}

    public static IncentiveBreakdown calculate(IncentivePlan plan, Map<Metric, Achieved> achieved, Map<Goal.Key, Goal> goals) {
        if (plan == null) return IncentiveBreakdown.none();
        List<IncentiveBreakdown.LineResult> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (IncentivePlanLine line : plan.getLines()) {
            Optional<Metric> metric = Metric.parse(line.getMetric());
            if (metric.isEmpty() || line.getRate() == null) continue;
            Achieved a = achieved.getOrDefault(metric.get(), Achieved.ZERO);
            boolean percent = IncentivePlanLine.PERCENT_OF_AMOUNT.equals(line.getBasis());
            BigDecimal base = percent ? a.amountOrZero() : null;
            BigDecimal earned = percent
                    ? money(base.multiply(line.getRate()).divide(HUNDRED, 4, RoundingMode.HALF_UP))
                    : money(line.getRate().multiply(BigDecimal.valueOf(a.count())));
            boolean belowMinimum = line.getMinUnits() != null && line.getMinUnits() > 0 && a.count() < line.getMinUnits();
            if (belowMinimum) earned = BigDecimal.ZERO.setScale(2);
            boolean capped = false;
            if (line.getCapAmount() != null && line.getCapAmount().signum() > 0 && earned.compareTo(line.getCapAmount()) > 0) {
                earned = money(line.getCapAmount());
                capped = true;
            }
            total = total.add(earned);
            lines.add(new IncentiveBreakdown.LineResult(line.getId(), metric.get().name(), metric.get().label(),
                    line.getBasis(), line.getRate(), a.count(), base, earned, line.getMinUnits(), line.getCapAmount(),
                    belowMinimum, capped));
        }

        List<IncentiveBreakdown.BonusResult> bonuses = new ArrayList<>();
        Map<String, List<IncentivePlanBonus>> byMetric = new LinkedHashMap<>();
        for (IncentivePlanBonus b : plan.getBonuses()) byMetric.computeIfAbsent(b.getMetric(), k -> new ArrayList<>()).add(b);
        for (Map.Entry<String, List<IncentivePlanBonus>> entry : byMetric.entrySet()) {
            Optional<Metric> metric = Metric.parse(entry.getKey());
            if (metric.isEmpty()) continue;
            Achieved a = achieved.getOrDefault(metric.get(), Achieved.ZERO);
            BigDecimal attainment = attainmentPct(metric.get(), a, goals);
            List<IncentivePlanBonus> tiers = new ArrayList<>(entry.getValue());
            tiers.sort(Comparator.comparing(IncentivePlanBonus::getThresholdPct, Comparator.nullsFirst(Comparator.naturalOrder())));

            IncentivePlanBonus paid = null;
            for (IncentivePlanBonus b : tiers) {
                if (attainment != null && b.getThresholdPct() != null && attainment.compareTo(b.getThresholdPct()) >= 0
                        && conditionMet(b, achieved)) {
                    paid = b;
                }
            }
            for (IncentivePlanBonus b : tiers) {
                boolean reached = b == paid;
                BigDecimal earned = reached ? reward(b, a) : BigDecimal.ZERO.setScale(2);
                total = total.add(earned);
                bonuses.add(new IncentiveBreakdown.BonusResult(b.getId(), metric.get().name(), metric.get().label(),
                        b.getThresholdPct(), attainment, b.getRewardType(), b.getRewardValue(), reached,
                        conditionMet(b, achieved), earned));
            }
        }
        return new IncentiveBreakdown(plan.getId(), plan.getName(), lines, bonuses, total.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP), false);
    }

    /**
     * What one credited activity earns at the plan's line rates (the ledger's transaction list).
     * Minimums, caps and bonuses only exist for the month as a whole, so they are left out here;
     * the month's total is always {@link #calculate}.
     */
    public static BigDecimal perActivity(IncentivePlan plan, String metric, int quantity, BigDecimal amount) {
        if (plan == null) return BigDecimal.ZERO.setScale(2);
        BigDecimal out = BigDecimal.ZERO;
        for (IncentivePlanLine line : plan.getLines()) {
            if (!line.getMetric().equals(metric) || line.getRate() == null) continue;
            if (IncentivePlanLine.PERCENT_OF_AMOUNT.equals(line.getBasis())) {
                if (amount != null) out = out.add(amount.multiply(line.getRate()).divide(HUNDRED, 4, RoundingMode.HALF_UP));
            } else {
                out = out.add(line.getRate().multiply(BigDecimal.valueOf(quantity)));
            }
        }
        return money(out);
    }

    /** achieved ÷ goal × 100 on the metric's money goal if it has one, else its count goal; null without a goal. */
    static BigDecimal attainmentPct(Metric metric, Achieved a, Map<Goal.Key, Goal> goals) {
        Goal goal = goals.get(new Goal.Key(metric, Measure.AMOUNT));
        if (goal == null) goal = goals.get(new Goal.Key(metric, Measure.COUNT));
        if (goal == null || goal.goal().signum() <= 0) return null;
        return a.value(goal.measure()).multiply(HUNDRED).divide(goal.goal(), 2, RoundingMode.HALF_UP);
    }

    static boolean conditionMet(IncentivePlanBonus b, Map<Metric, Achieved> achieved) {
        if (b.getConditionMetric() == null || b.getConditionMetric().isBlank() || b.getConditionMin() == null) return true;
        Optional<Metric> metric = Metric.parse(b.getConditionMetric());
        if (metric.isEmpty()) return false;
        Achieved a = achieved.getOrDefault(metric.get(), Achieved.ZERO);
        BigDecimal value = metric.get().hasCount() ? BigDecimal.valueOf(a.count()) : a.amountOrZero();
        return value.compareTo(b.getConditionMin()) >= 0;
    }

    private static BigDecimal reward(IncentivePlanBonus b, Achieved a) {
        if (b.getRewardValue() == null) return BigDecimal.ZERO.setScale(2);
        if (IncentivePlanBonus.PERCENT_OF_METRIC_AMOUNT.equals(b.getRewardType())) {
            return money(a.amountOrZero().multiply(b.getRewardValue()).divide(HUNDRED, 4, RoundingMode.HALF_UP));
        }
        return money(b.getRewardValue());
    }

    private static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
