package com.company.project.performance.events;

import com.company.project.entities.Staff;
import com.company.project.performance.PerformanceClock;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.metric.Metric;
import com.company.project.services.ShiftAttendanceService;
import com.company.project.services.StaffProgressCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * Parity check (plan §8 Phase 1): the old name-matching {@link StaffProgressCalculator} figures
 * next to the ledger's, per staff member and month, for the metrics both know. Differences are
 * expected only where the old LIKE '%name%' match credited the wrong person (or nobody), and
 * from the old calculator's server-time month boundaries. Goes away with the old calculator.
 */
@Service
@Transactional(readOnly = true)
public class PerformanceParityService {

    private final StaffProgressCalculator oldCalculator;
    private final PerformanceEngine engine;
    private final ShiftAttendanceService attendance;
    private final PerformanceClock clock;

    public PerformanceParityService(StaffProgressCalculator oldCalculator, PerformanceEngine engine,
                                    ShiftAttendanceService attendance, PerformanceClock clock) {
        this.oldCalculator = oldCalculator;
        this.engine = engine;
        this.attendance = attendance;
        this.clock = clock;
    }

    public Map<String, Object> compare(int months, boolean differencesOnly) {
        YearMonth to = clock.currentMonth(null);
        YearMonth from = to.minusMonths(Math.max(1, Math.min(12, months)) - 1);
        List<Staff> staff = attendance.workforce();
        List<Long> ids = staff.stream().map(Staff::getId).toList();
        List<Map<String, Object>> rows = new ArrayList<>();
        int differing = 0;
        for (YearMonth m = from; !m.isAfter(to); m = m.plusMonths(1)) {
            Map<Long, PeriodResult> results = engine.evaluate(ids, m);
            LocalDateTime start = m.atDay(1).atStartOfDay();
            LocalDateTime end = m.plusMonths(1).atDay(1).atStartOfDay();
            for (Staff s : staff) {
                String login = s.getAppUsername() != null ? s.getAppUsername() : "";
                Map<String, Integer> units = oldCalculator.computeUnits(s, login, start, end);
                PeriodResult r = results.get(s.getId());
                if (r == null) continue;
                Map<String, Object[]> pairs = new LinkedHashMap<>();
                pairs.put("admission_count", new Object[]{units.getOrDefault("admissions", 0), r.count(Metric.MEMBER_ADMISSION)});
                pairs.put("admission_amount", new Object[]{oldCalculator.computeRevenue(s, login, start, end, "New"), r.amount(Metric.MEMBER_ADMISSION)});
                pairs.put("pos_count", new Object[]{units.getOrDefault("pos_sales", 0), r.count(Metric.POS_SALE)});
                pairs.put("pos_amount", new Object[]{oldCalculator.computePosRevenue(login, start, end), r.amount(Metric.POS_SALE)});
                pairs.put("pt_sessions", new Object[]{units.getOrDefault("pt_sessions", 0), r.count(Metric.PT_SESSION_DELIVERED)});
                boolean differs = pairs.values().stream().anyMatch(p -> !same(p[0], p[1]));
                if (differs) differing++;
                if (differencesOnly && !differs) continue;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("period", m.toString());
                row.put("staff_id", s.getId());
                row.put("name", s.getName());
                pairs.forEach((k, v) -> {
                    row.put(k + "_old", v[0]);
                    row.put(k + "_new", v[1]);
                });
                row.put("differs", differs);
                rows.add(row);
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("from", from.toString());
        out.put("to", to.toString());
        out.put("staff_months_differing", differing);
        out.put("rows", rows);
        return out;
    }

    private static boolean same(Object a, Object b) {
        return new BigDecimal(a.toString()).compareTo(new BigDecimal(b.toString())) == 0;
    }
}
