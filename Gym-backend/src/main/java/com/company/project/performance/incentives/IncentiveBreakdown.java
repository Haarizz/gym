package com.company.project.performance.incentives;

import java.math.BigDecimal;
import java.util.List;

/**
 * What a person earns for a month under their plan: each commission line, each bonus, and the
 * total. The same shape is frozen into commission_earnings.breakdown_json on approval.
 */
public record IncentiveBreakdown(Long planId, String planName, List<LineResult> lines, List<BonusResult> bonuses,
                                 BigDecimal total, boolean legacy) {

    public static IncentiveBreakdown none() {
        return new IncentiveBreakdown(null, null, List.of(), List.of(), BigDecimal.ZERO, false);
    }

    public boolean hasPlan() {
        return planId != null || legacy;
    }

    /**
     * @param units       count credited this month on the metric
     * @param base        money the percentage applied to (null for per-unit lines)
     * @param earned      after minimum and cap
     * @param belowMinimum the minimum units weren't reached, so the line paid nothing
     * @param capped      the cap cut the line down
     */
    public record LineResult(Long lineId, String metric, String label, String basis, BigDecimal rate,
                             long units, BigDecimal base, BigDecimal earned,
                             Integer minUnits, BigDecimal capAmount, boolean belowMinimum, boolean capped) {}

    /**
     * @param attainmentPct achieved ÷ goal × 100 (null when the person has no goal on the metric)
     * @param reached       this tier is the one paid
     */
    public record BonusResult(Long bonusId, String metric, String label, BigDecimal thresholdPct, BigDecimal attainmentPct,
                              String rewardType, BigDecimal rewardValue, boolean reached, boolean conditionMet,
                              BigDecimal earned) {}
}
