package com.company.project.performance.incentives;

import com.company.project.performance.metric.Achieved;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.performance.targets.Goal;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class IncentiveCalculatorTest {

    private static IncentivePlan plan() {
        IncentivePlan p = new IncentivePlan();
        p.setId(1L);
        p.setName("Sales");
        return p;
    }

    private static IncentivePlanLine line(IncentivePlan p, Metric m, String basis, String rate) {
        IncentivePlanLine l = new IncentivePlanLine();
        l.setMetric(m.name());
        l.setBasis(basis);
        l.setRate(new BigDecimal(rate));
        p.getLines().add(l);
        return l;
    }

    private static IncentivePlanBonus bonus(IncentivePlan p, Metric m, String threshold, String type, String value) {
        IncentivePlanBonus b = new IncentivePlanBonus();
        b.setMetric(m.name());
        b.setThresholdPct(new BigDecimal(threshold));
        b.setRewardType(type);
        b.setRewardValue(new BigDecimal(value));
        p.getBonuses().add(b);
        return b;
    }

    private static Map<Metric, Achieved> achieved(Object... pairs) {
        Map<Metric, Achieved> a = new EnumMap<>(Metric.class);
        for (int i = 0; i < pairs.length; i += 3) {
            a.put((Metric) pairs[i], new Achieved((Integer) pairs[i + 1], pairs[i + 2] != null ? new BigDecimal((String) pairs[i + 2]) : null));
        }
        BigDecimal revenue = BigDecimal.ZERO;
        for (Metric m : Metric.revenueMetrics()) revenue = revenue.add(a.getOrDefault(m, Achieved.ZERO).amountOrZero());
        a.put(Metric.REVENUE_TOTAL, new Achieved(0, revenue));
        return a;
    }

    private static Map<Goal.Key, Goal> goal(Metric m, Measure measure, String value) {
        Map<Goal.Key, Goal> g = new LinkedHashMap<>();
        Goal goal = new Goal(m, measure, new BigDecimal(value), "staff", 1L);
        g.put(goal.key(), goal);
        return g;
    }

    @Test
    void noPlanEarnsNothing() {
        IncentiveBreakdown b = IncentiveCalculator.calculate(null, achieved(Metric.MEMBER_ADMISSION, 3, "30000"), Map.of());
        assertFalse(b.hasPlan());
        assertEquals(0, b.total().signum());
    }

    @Test
    void percentAndPerUnitLines() {
        IncentivePlan p = plan();
        line(p, Metric.MEMBER_ADMISSION, IncentivePlanLine.PERCENT_OF_AMOUNT, "5");
        line(p, Metric.PT_SESSION_DELIVERED, IncentivePlanLine.FIXED_PER_UNIT, "150");
        IncentiveBreakdown b = IncentiveCalculator.calculate(p,
                achieved(Metric.MEMBER_ADMISSION, 2, "20000", Metric.PT_SESSION_DELIVERED, 10, null), Map.of());
        assertEquals(new BigDecimal("1000.00"), b.lines().get(0).earned());
        assertEquals(new BigDecimal("1500.00"), b.lines().get(1).earned());
        assertEquals(new BigDecimal("2500.00"), b.total());
    }

    @Test
    void minimumUnitsGateTheWholeLine() {
        IncentivePlan p = plan();
        IncentivePlanLine l = line(p, Metric.MEMBER_ADMISSION, IncentivePlanLine.FIXED_PER_UNIT, "200");
        l.setMinUnits(5);
        IncentiveBreakdown below = IncentiveCalculator.calculate(p, achieved(Metric.MEMBER_ADMISSION, 4, "4000"), Map.of());
        assertTrue(below.lines().get(0).belowMinimum());
        assertEquals(0, below.total().signum());
        IncentiveBreakdown reached = IncentiveCalculator.calculate(p, achieved(Metric.MEMBER_ADMISSION, 5, "5000"), Map.of());
        assertEquals(new BigDecimal("1000.00"), reached.total());
    }

    @Test
    void capLimitsALine() {
        IncentivePlan p = plan();
        IncentivePlanLine l = line(p, Metric.POS_SALE, IncentivePlanLine.PERCENT_OF_AMOUNT, "10");
        l.setCapAmount(new BigDecimal("500"));
        IncentiveBreakdown b = IncentiveCalculator.calculate(p, achieved(Metric.POS_SALE, 40, "9000"), Map.of());
        assertTrue(b.lines().get(0).capped());
        assertEquals(new BigDecimal("500.00"), b.total());
    }

    @Test
    void bonusTiersDontStackAndNeedAGoal() {
        IncentivePlan p = plan();
        bonus(p, Metric.REVENUE_TOTAL, "100", IncentivePlanBonus.FIXED, "2000");
        bonus(p, Metric.REVENUE_TOTAL, "120", IncentivePlanBonus.FIXED, "5000");
        Map<Metric, Achieved> a = achieved(Metric.MEMBER_ADMISSION, 3, "70000", Metric.POS_SALE, 5, "20000"); // 90,000

        assertEquals(0, IncentiveCalculator.calculate(p, a, Map.of()).total().signum(), "no goal, no bonus");

        IncentiveBreakdown hit = IncentiveCalculator.calculate(p, a, goal(Metric.REVENUE_TOTAL, Measure.AMOUNT, "80000")); // 112.5%
        assertEquals(new BigDecimal("2000.00"), hit.total());
        assertTrue(hit.bonuses().get(0).reached());
        assertFalse(hit.bonuses().get(1).reached());

        IncentiveBreakdown top = IncentiveCalculator.calculate(p, a, goal(Metric.REVENUE_TOTAL, Measure.AMOUNT, "75000")); // 120%
        assertEquals(new BigDecimal("5000.00"), top.total());
    }

    @Test
    void percentBonusAndCondition() {
        IncentivePlan p = plan();
        IncentivePlanBonus b = bonus(p, Metric.REVENUE_TOTAL, "100", IncentivePlanBonus.PERCENT_OF_METRIC_AMOUNT, "2");
        b.setConditionMetric(Metric.LEAD_CONVERSION.name());
        b.setConditionMin(new BigDecimal("3"));
        Map<Goal.Key, Goal> g = goal(Metric.REVENUE_TOTAL, Measure.AMOUNT, "50000");

        Map<Metric, Achieved> unmet = achieved(Metric.MEMBER_ADMISSION, 5, "50000", Metric.LEAD_CONVERSION, 2, null);
        assertEquals(0, IncentiveCalculator.calculate(p, unmet, g).total().signum());

        Map<Metric, Achieved> met = achieved(Metric.MEMBER_ADMISSION, 5, "50000", Metric.LEAD_CONVERSION, 3, null);
        assertEquals(new BigDecimal("1000.00"), IncentiveCalculator.calculate(p, met, g).total());
    }

    @Test
    void countGoalDrivesAttainmentForCountMetrics() {
        IncentivePlan p = plan();
        bonus(p, Metric.PT_SESSION_DELIVERED, "100", IncentivePlanBonus.FIXED, "1500");
        IncentiveBreakdown b = IncentiveCalculator.calculate(p, achieved(Metric.PT_SESSION_DELIVERED, 40, null),
                goal(Metric.PT_SESSION_DELIVERED, Measure.COUNT, "40"));
        assertEquals(new BigDecimal("1500.00"), b.total());
    }

    @Test
    void clawbackNeverTakesTheMonthBelowZero() {
        IncentivePlan p = plan();
        line(p, Metric.POS_SALE, IncentivePlanLine.PERCENT_OF_AMOUNT, "10");
        IncentiveBreakdown b = IncentiveCalculator.calculate(p, achieved(Metric.POS_SALE, -1, "-3000"), Map.of());
        assertEquals(new BigDecimal("-300.00"), b.lines().get(0).earned());
        assertEquals(new BigDecimal("0.00"), b.total());
    }

    @Test
    void perActivityUsesLineRates() {
        IncentivePlan p = plan();
        line(p, Metric.POS_SALE, IncentivePlanLine.PERCENT_OF_AMOUNT, "5");
        line(p, Metric.POS_SALE, IncentivePlanLine.FIXED_PER_UNIT, "20");
        assertEquals(new BigDecimal("70.00"), IncentiveCalculator.perActivity(p, "POS_SALE", 1, new BigDecimal("1000")));
        assertEquals(new BigDecimal("0.00"), IncentiveCalculator.perActivity(p, "LEAD_CONVERSION", 1, null));
    }

    @Test
    void breakdownSurvivesTheSettlementSnapshot() throws Exception {
        IncentivePlan p = plan();
        line(p, Metric.MEMBER_ADMISSION, IncentivePlanLine.PERCENT_OF_AMOUNT, "5");
        bonus(p, Metric.REVENUE_TOTAL, "100", IncentivePlanBonus.FIXED, "2000");
        IncentiveBreakdown b = IncentiveCalculator.calculate(p, achieved(Metric.MEMBER_ADMISSION, 2, "20000"),
                goal(Metric.REVENUE_TOTAL, Measure.AMOUNT, "20000"));

        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule())
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        IncentiveBreakdown back = mapper.readValue(mapper.writeValueAsString(b), IncentiveBreakdown.class);
        assertEquals(b, back);
    }
}
