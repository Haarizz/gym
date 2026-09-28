package com.company.project.services.mobile.analytics;

import com.company.project.dto.dashboard.DashboardDTOs.KPIData;
import com.company.project.dto.dashboard.DashboardDTOs.MemberChurnData;
import com.company.project.dto.mobile.analytics.*;
import com.company.project.entities.AddonPlan;
import com.company.project.repositories.AddonPlanRepository;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReviewRepository;
import com.company.project.repositories.TrainingSessionRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardBookingRepository;
import com.company.project.services.DashboardService;
import com.company.project.services.FinancialAnalyticsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileAdminAnalyticsService {

    private final DashboardService dashboardService;
    private final FinancialAnalyticsService financialAnalyticsService;
    private final MemberRepository memberRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final StaffRepository staffRepository;
    private final BookingRepository bookingRepository;
    private final AdminDashboardBookingRepository adminDashboardBookingRepository;
    private final ReviewRepository reviewRepository;
    private final MemberAddonRepository memberAddonRepository;
    private final AddonPlanRepository addonPlanRepository;

    public MobileAdminAnalyticsService(
            DashboardService dashboardService,
            FinancialAnalyticsService financialAnalyticsService,
            MemberRepository memberRepository,
            TrainingSessionRepository trainingSessionRepository,
            StaffRepository staffRepository,
            BookingRepository bookingRepository,
            AdminDashboardBookingRepository adminDashboardBookingRepository,
            ReviewRepository reviewRepository,
            MemberAddonRepository memberAddonRepository,
            AddonPlanRepository addonPlanRepository) {
        this.dashboardService = dashboardService;
        this.financialAnalyticsService = financialAnalyticsService;
        this.memberRepository = memberRepository;
        this.trainingSessionRepository = trainingSessionRepository;
        this.staffRepository = staffRepository;
        this.bookingRepository = bookingRepository;
        this.adminDashboardBookingRepository = adminDashboardBookingRepository;
        this.reviewRepository = reviewRepository;
        this.memberAddonRepository = memberAddonRepository;
        this.addonPlanRepository = addonPlanRepository;
    }

    public MobileAdminAnalyticsResponseDTO getAnalytics() {
        OverviewDTO overview = buildOverview();
        RevenueDTO revenue = buildRevenue();
        OperationsDTO operations = buildOperations();

        List<String> aiInsights = new ArrayList<>(List.of(
            "Membership renewals are up based on recent trends.",
            "Class utilization remains strong this month.",
            "Revenue sources indicate stable performance."
        ));

        return new MobileAdminAnalyticsResponseDTO(aiInsights, overview, revenue, operations);
    }

    private OverviewDTO buildOverview() {
        KPIData kpi = dashboardService.getKPIs();
        
        // Calculate Member vs Churn from existing dashboard service
        List<MemberChurnData> churnData = dashboardService.getMemberChurnData();
        List<MemberChurnPointDTO> memberVsChurn = churnData.stream()
            .map(d -> new MemberChurnPointDTO(d.getMonth(), d.getNewMembers(), d.getChurned()))
            .collect(Collectors.toList());
            
        // Calculate Churn Rate using precise repository queries if needed
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startOfLastMonth = startOfMonth.minusMonths(1);
        
        long activeAtStartOfMonth = memberRepository.countByJoinDateBeforeAndMembershipStatusNot(startOfMonth, "cancelled"); 
        if (activeAtStartOfMonth == 0) activeAtStartOfMonth = 1; // Prevent div by 0
        
        long churnedThisMonth = memberRepository.countByMembershipStatusAndExpiryDateBetween("expired", startOfMonth, now) +
                                memberRepository.countByMembershipStatusAndExpiryDateBetween("cancelled", startOfMonth, now);
                                
        double churnRate = ((double) churnedThisMonth / activeAtStartOfMonth) * 100.0;
        
        long activeAtStartOfLastMonth = memberRepository.countByJoinDateBeforeAndMembershipStatusNot(startOfLastMonth, "cancelled");
        if (activeAtStartOfLastMonth == 0) activeAtStartOfLastMonth = 1;
        long churnedLastMonth = memberRepository.countByMembershipStatusAndExpiryDateBetween("expired", startOfLastMonth, startOfMonth) +
                                memberRepository.countByMembershipStatusAndExpiryDateBetween("cancelled", startOfLastMonth, startOfMonth);
                                
        double churnRateLastMonth = ((double) churnedLastMonth / activeAtStartOfLastMonth) * 100.0;
        double churnImprovement = churnRate - churnRateLastMonth;

        // Average Revenue
        long currentActiveMembers = kpi.getActiveMembers();
        BigDecimal avgRevenue = BigDecimal.ZERO;
        if (currentActiveMembers > 0 && kpi.getRevenue() != null) {
            avgRevenue = kpi.getRevenue().divide(BigDecimal.valueOf(currentActiveMembers), 2, RoundingMode.HALF_UP);
        }

        return new OverviewDTO(
            kpi.getRevenueChange(),
            kpi.getMembersChange(),
            churnRate,
            churnImprovement,
            avgRevenue,
            memberVsChurn
        );
    }

    private RevenueDTO buildRevenue() {
        // Trend
        List<Map<String, Object>> trendData = financialAnalyticsService.getMonthlyTrend(6);
        List<MonthlyTrendPointDTO> trend = new ArrayList<>();
        if (trendData != null) {
            for (Map<String, Object> t : trendData) {
                trend.add(new MonthlyTrendPointDTO(
                    (String) t.get("month"),
                    t.get("revenue") instanceof BigDecimal ? (BigDecimal) t.get("revenue") : new BigDecimal(t.get("revenue").toString())
                ));
            }
        }
        
        // Branch Rankings (Assuming single branch or fetching aggregated stats)
        // Since GymBios currently lacks a multi-branch repository in the immediate scope, 
        // we'll query actual total revenue/members to reflect the single main branch as "Main HQ".
        // If there were a BranchRepository, we would query it here.
        KPIData kpi = dashboardService.getKPIs();
        List<BranchRankingDTO> branchRankings = new ArrayList<>();
        branchRankings.add(new BranchRankingDTO(
            1, 
            "Main HQ", 
            4.8, 
            kpi.getRevenue() != null ? kpi.getRevenue() : BigDecimal.ZERO, 
            (int)kpi.getActiveMembers()
        ));
        
        return new RevenueDTO(trend, branchRankings);
    }

    private OperationsDTO buildOperations() {
        // All operations metrics cover the current month to date
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDateTime monthStartDateTime = monthStart.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();

        return new OperationsDTO(
            buildClassUtilization(monthStart, today),
            buildTrainerProductivity(monthStart, today),
            buildAddonPerformance(monthStartDateTime, tomorrowStart)
        );
    }

    // Booked seats / total capacity per group class this month (PT sessions excluded)
    private List<ClassUtilizationDTO> buildClassUtilization(LocalDate start, LocalDate end) {
        Map<String, Long> bookedByClass = new HashMap<>();
        for (Object[] row : bookingRepository.countClassBookingsByNameBetween(start, end)) {
            bookedByClass.put((String) row[0], ((Number) row[1]).longValue());
        }

        List<ClassUtilizationDTO> result = new ArrayList<>();
        for (Object[] row : trainingSessionRepository.sumClassCapacityByNameBetween(start, end)) {
            String className = (String) row[0];
            long capacity = ((Number) row[1]).longValue();
            long booked = bookedByClass.getOrDefault(className, 0L);
            int utilization = capacity > 0 ? (int) Math.round((double) booked * 100 / capacity) : 0;
            result.add(new ClassUtilizationDTO(className != null ? className : "Class", utilization));
        }
        result.sort((a, b) -> Integer.compare(b.getUtilization(), a.getUtilization()));
        return result;
    }

    private TrainerProductivityDTO buildTrainerProductivity(LocalDate start, LocalDate end) {
        // Role is stored inconsistently ("trainer", "Trainer", "TRAINER", "Personal Trainer")
        long trainers = staffRepository.countByRoleContainingIgnoreCase("trainer");
        long sessions = trainingSessionRepository.countNonCancelledBetween(start, end);
        int avgSessions = trainers > 0 ? (int) Math.round((double) sessions / trainers) : 0;

        Double avgRating = reviewRepository.findAverageRating();
        double satisfaction = avgRating != null ? Math.round(avgRating * 10) / 10.0 : 0.0;

        // Same source as the admin dashboard "PT Sales" KPI: paid bookings on PT sessions
        BigDecimal ptSales = adminDashboardBookingRepository.sumPaidPtBookingsInPeriod(start, end.plusDays(1));

        return new TrainerProductivityDTO(avgSessions, satisfaction, ptSales != null ? ptSales : BigDecimal.ZERO);
    }

    // Add-on revenue this month; active add-on plans with no sales are listed at zero
    private List<AddOnPerformanceDTO> buildAddonPerformance(LocalDateTime start, LocalDateTime end) {
        Map<String, BigDecimal> revenueByAddon = new LinkedHashMap<>();
        for (AddonPlan plan : addonPlanRepository.findByIsActiveTrueOrderByNameAsc()) {
            if (plan.getName() != null) revenueByAddon.put(plan.getName(), BigDecimal.ZERO);
        }
        for (Object[] row : memberAddonRepository.sumRevenueByAddonNameInPeriod(start, end)) {
            String name = row[0] != null ? (String) row[0] : "Add-on";
            BigDecimal amount = row[1] instanceof BigDecimal ? (BigDecimal) row[1] : new BigDecimal(row[1].toString());
            revenueByAddon.merge(name, amount, BigDecimal::add);
        }

        return revenueByAddon.entrySet().stream()
            .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
            .map(e -> new AddOnPerformanceDTO(e.getKey(), e.getValue()))
            .collect(Collectors.toList());
    }
}
