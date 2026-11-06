package com.company.project.performance;

import com.company.project.performance.incentives.IncentiveBreakdown;
import com.company.project.performance.metric.Achieved;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.performance.settlement.SettlementView;
import com.company.project.performance.targets.Goal;
import com.company.project.repositories.PosSettingsRepository;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Builders for engine results in service tests. */
public final class PerformanceTestData {

    private PerformanceTestData() {}

    /** A clock in UTC (no POS time zone set). */
    public static PerformanceClock utcClock() {
        PosSettingsRepository settings = mock(PosSettingsRepository.class);
        when(settings.findFirstByBranchId(any())).thenReturn(Optional.empty());
        return new PerformanceClock(settings);
    }

    public static Builder result(Long staffId, YearMonth period) {
        return new Builder(staffId, period);
    }

    public static final class Builder {
        private final Long staffId;
        private final YearMonth period;
        private final Map<Metric, Achieved> achieved = new EnumMap<>(Metric.class);
        private final Map<Goal.Key, Goal> goals = new LinkedHashMap<>();
        private BigDecimal commission = BigDecimal.ZERO;
        private String status = SettlementView.ESTIMATED;

        Builder(Long staffId, YearMonth period) {
            this.staffId = staffId;
            this.period = period;
        }

        public Builder achieved(Metric m, long count, String amount) {
            achieved.put(m, new Achieved(count, amount != null ? new BigDecimal(amount) : null));
            return this;
        }

        public Builder goal(Metric m, Measure measure, String goal) {
            Goal g = new Goal(m, measure, new BigDecimal(goal), "staff", 1L);
            goals.put(g.key(), g);
            return this;
        }

        public Builder commission(String amount) {
            this.commission = new BigDecimal(amount);
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public PeriodResult build() {
            BigDecimal revenue = BigDecimal.ZERO;
            for (Metric m : Metric.revenueMetrics()) revenue = revenue.add(achieved.getOrDefault(m, Achieved.ZERO).amountOrZero());
            achieved.put(Metric.REVENUE_TOTAL, new Achieved(0, revenue));
            IncentiveBreakdown incentive = new IncentiveBreakdown(1L, "Plan", List.of(), List.of(), commission, false);
            SettlementView settlement = new SettlementView(status, commission, commission, null, null, null, null, null, null, 1L);
            return new PeriodResult(staffId, period, achieved, goals, incentive, settlement);
        }
    }
}
