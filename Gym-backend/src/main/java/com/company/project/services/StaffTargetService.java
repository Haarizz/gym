package com.company.project.services;

import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.PerformanceClock;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.metric.Achieved;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.*;

/**
 * Read-only compatibility view of the old /api/staff-targets shape, for app versions that still
 * call it. Everything comes from {@link PerformanceEngine}; targets are set through
 * /api/performance/targets. Removed with the old endpoints (plan §8 Phase 6).
 */
@Service
@Transactional(readOnly = true)
public class StaffTargetService {

    private final PerformanceEngine engine;
    private final StaffRepository staffRepository;
    private final ShiftAttendanceService attendance;
    private final PerformanceClock clock;

    public StaffTargetService(PerformanceEngine engine, StaffRepository staffRepository,
                              ShiftAttendanceService attendance, PerformanceClock clock) {
        this.engine = engine;
        this.staffRepository = staffRepository;
        this.attendance = attendance;
        this.clock = clock;
    }

    public List<StaffTargetResponseDTO> getTargets(Integer year, Integer month, String scope, Long staffDbId) {
        YearMonth m = year != null && month != null ? YearMonth.of(year, month) : clock.currentMonth(null);
        List<StaffTargetResponseDTO> out = new ArrayList<>();
        if (scope == null || "individual".equalsIgnoreCase(scope)) {
            List<Staff> staff = staffDbId != null
                    ? staffRepository.findById(staffDbId).map(List::of).orElse(List.of())
                    : attendance.workforce();
            Map<Long, PeriodResult> results = engine.evaluate(staff.stream().map(Staff::getId).toList(), m);
            for (Staff s : staff) {
                PeriodResult r = results.get(s.getId());
                if (r != null && !r.goals().isEmpty()) out.add(individual(s, r));
            }
        }
        if (staffDbId == null && (scope == null || "institution".equalsIgnoreCase(scope))) {
            PerformanceEngine.BranchResult b = engine.evaluateBranch(BranchContextHolder.getActiveBranchId(), m);
            if (!b.goals().isEmpty()) out.add(institution(b));
        }
        return out;
    }

    public List<StaffTargetResponseDTO> getMyTargets(Long userId, Integer year, Integer month) {
        Staff staff = staffRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
        return getTargets(year, month, "individual", staff.getId());
    }

    private static StaffTargetResponseDTO individual(Staff s, PeriodResult r) {
        StaffTargetResponseDTO dto = base(r.period(), r.achieved(), new GoalReader(r));
        dto.setId("staff-" + s.getId() + "-" + r.period());
        dto.setScope("individual");
        dto.setStaffDbId(String.valueOf(s.getId()));
        dto.setStaffId(s.getStaffId());
        dto.setStaffName(s.getName());
        dto.setStaffRole(s.getRole());
        dto.setStaffDepartment(s.getDepartment());
        dto.setCommissionEarned(r.commission());
        return dto;
    }

    private static StaffTargetResponseDTO institution(PerformanceEngine.BranchResult b) {
        StaffTargetResponseDTO dto = base(b.period(), b.achieved(), (metric, measure) -> {
            var g = b.goals().get(new com.company.project.performance.targets.Goal.Key(metric, measure));
            return g != null ? g.goal() : null;
        });
        dto.setId("branch-" + b.branchId() + "-" + b.period());
        dto.setScope("institution");
        dto.setCommissionEarned(BigDecimal.ZERO);
        return dto;
    }

    private interface GoalLookup {
        BigDecimal goal(Metric metric, Measure measure);
    }

    private record GoalReader(PeriodResult r) implements GoalLookup {
        public BigDecimal goal(Metric metric, Measure measure) {
            return r.goal(metric, measure);
        }
    }

    private static StaffTargetResponseDTO base(YearMonth m, Map<Metric, Achieved> achieved, GoalLookup goals) {
        StaffTargetResponseDTO dto = new StaffTargetResponseDTO();
        dto.setTimeframe("monthly");
        dto.setYear(m.getYear());
        dto.setMonth(m.getMonthValue());
        dto.setStartDate(m.atDay(1).toString());
        dto.setEndDate(m.atEndOfMonth().toString());
        BigDecimal revenue = achieved.getOrDefault(Metric.REVENUE_TOTAL, Achieved.ZERO).amountOrZero();
        BigDecimal revenueGoal = goals.goal(Metric.REVENUE_TOTAL, Measure.AMOUNT);
        dto.setRevenueTarget(revenueGoal);
        dto.setRevenueAchieved(revenue);
        dto.setPercentage(revenueGoal != null && revenueGoal.signum() > 0
                ? revenue.multiply(BigDecimal.valueOf(100)).divide(revenueGoal, 0, RoundingMode.HALF_UP).intValue() : 0);
        dto.setMembershipRevenueTarget(goals.goal(Metric.MEMBER_ADMISSION, Measure.AMOUNT));
        dto.setPosRevenueTarget(goals.goal(Metric.POS_SALE, Measure.AMOUNT));
        // PT: money members paid for PT with this trainer (packages + paid sessions), on payment.
        // Commission timing (package "on completion") affects only the commission, not the target.
        dto.setPtRevenueTarget(goals.goal(Metric.PT_SALE, Measure.AMOUNT));
        dto.withRevenueBreakdown(achieved.getOrDefault(Metric.MEMBER_ADMISSION, Achieved.ZERO).amountOrZero(),
                achieved.getOrDefault(Metric.POS_SALE, Achieved.ZERO).amountOrZero(),
                achieved.getOrDefault(Metric.PT_SALE, Achieved.ZERO).amountOrZero());
        dto.setSessionsTarget(intOrNull(goals.goal(Metric.PT_SESSION_DELIVERED, Measure.COUNT)));
        dto.setSessionsAchieved((int) achieved.getOrDefault(Metric.PT_SESSION_DELIVERED, Achieved.ZERO).count());
        dto.setNewClientsTarget(intOrNull(goals.goal(Metric.LEAD_CONVERSION, Measure.COUNT)));
        dto.setNewClientsAchieved((int) achieved.getOrDefault(Metric.LEAD_CONVERSION, Achieved.ZERO).count());
        StringBuilder units = new StringBuilder("[");
        Map<String, Integer> unitsAchieved = new LinkedHashMap<>();
        for (Object[] u : new Object[][]{{"admissions", Metric.MEMBER_ADMISSION}, {"pos_sales", Metric.POS_SALE},
                {"pt_sessions", Metric.PT_SESSION_DELIVERED}, {"pt_packages", Metric.PT_SALE}}) {
            Metric metric = (Metric) u[1];
            int done = (int) achieved.getOrDefault(metric, Achieved.ZERO).count();
            unitsAchieved.put((String) u[0], done);
            Integer goal = intOrNull(goals.goal(metric, Measure.COUNT));
            if (goal == null) continue;
            if (units.length() > 1) units.append(',');
            units.append("{\"service\":\"").append(u[0]).append("\",\"target_units\":").append(goal)
                    .append(",\"achieved_units\":").append(done).append('}');
        }
        dto.setUnitTargetsJson(units.append(']').toString());
        dto.withUnits(unitsAchieved);
        dto.setTrend("stable");
        dto.setForecast(0);
        return dto;
    }

    private static Integer intOrNull(BigDecimal v) {
        return v != null ? v.intValue() : null;
    }
}
