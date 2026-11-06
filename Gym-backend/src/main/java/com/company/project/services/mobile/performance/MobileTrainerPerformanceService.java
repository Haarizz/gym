package com.company.project.services.mobile.performance;

import com.company.project.dto.mobile.performance.TrainerPerformanceResponseDTO;
import com.company.project.dto.mobile.performance.TrainerPerformanceResponseDTO.*;
import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/** Trainer performance screen: revenue and sessions from the performance engine. */
@Service
@Transactional(readOnly = true)
public class MobileTrainerPerformanceService {

    private final StaffRepository staffRepository;
    private final PerformanceEngine engine;

    public MobileTrainerPerformanceService(StaffRepository staffRepository, PerformanceEngine engine) {
        this.staffRepository = staffRepository;
        this.engine = engine;
    }

    public TrainerPerformanceResponseDTO getTrainerPerformance(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));

        YearMonth current = engine.clock().currentMonth(staff.getBranchId());
        PeriodResult month = engine.evaluate(staff.getId(), current);

        // 1. Monthly Performance - Revenue
        BigDecimal revenueAchieved = month.revenue();
        BigDecimal revenueGoal = month.goal(Metric.REVENUE_TOTAL, Measure.AMOUNT);
        BigDecimal revenueTarget = revenueGoal != null ? revenueGoal : BigDecimal.ZERO;
        Integer revenuePct = month.percent(Metric.REVENUE_TOTAL, Measure.AMOUNT);
        RevenuePerformanceDTO revenuePerformance = new RevenuePerformanceDTO(revenueAchieved, revenueTarget,
                revenuePct != null ? revenuePct : 0);

        // 2. Monthly Performance - Sessions (PT sessions delivered + classes taught)
        int sessionsCompleted = sessionsDelivered(month);
        int sessionsTarget = sessionsGoal(month);
        double sessionsPercentage = sessionsTarget > 0
                ? Math.round(((double) sessionsCompleted / sessionsTarget) * 1000.0) / 10.0 : 0;
        SessionPerformanceDTO sessionPerformance = new SessionPerformanceDTO(sessionsCompleted, sessionsTarget, sessionsPercentage);

        MonthlyPerformanceDTO monthlyPerformance = new MonthlyPerformanceDTO(revenuePerformance, sessionPerformance);

        // 3. Active Clients
        // Current schema limitation: No explicit trainer-client assignment relationship.
        ActiveClientsDTO activeClients = new ActiveClientsDTO(0, 0);

        // 4. Six-Month Trend
        List<TrainerSessionTrendDTO> sixMonthTrend = new ArrayList<>();
        engine.evaluate(List.of(staff.getId()), current.minusMonths(5), current).forEach((m, byStaff) -> {
            PeriodResult r = byStaff.get(staff.getId());
            sixMonthTrend.add(new TrainerSessionTrendDTO(m.toString(), r != null ? sessionsDelivered(r) : 0));
        });

        // 5. Performance Tip
        int sessionsRemaining = Math.max(sessionsTarget - sessionsCompleted, 0);
        double remainingPercentage = sessionsTarget > 0
                ? Math.round(((double) sessionsRemaining / sessionsTarget) * 1000.0) / 10.0 : 0;
        PerformanceTipDTO performanceTip = new PerformanceTipDTO(remainingPercentage, sessionsRemaining);

        return new TrainerPerformanceResponseDTO(
                monthlyPerformance,
                activeClients,
                sixMonthTrend,
                performanceTip
        );
    }

    /** Sessions a trainer delivered in the month: booked PT sessions plus classes held. */
    public static int sessionsDelivered(PeriodResult r) {
        return (int) (r.count(Metric.PT_SESSION_DELIVERED) + r.count(Metric.CLASS_TAUGHT));
    }

    /** The month's session goal: PT sessions plus classes. */
    public static int sessionsGoal(PeriodResult r) {
        BigDecimal pt = r.goal(Metric.PT_SESSION_DELIVERED, Measure.COUNT);
        BigDecimal classes = r.goal(Metric.CLASS_TAUGHT, Measure.COUNT);
        return (pt != null ? pt.intValue() : 0) + (classes != null ? classes.intValue() : 0);
    }
}
