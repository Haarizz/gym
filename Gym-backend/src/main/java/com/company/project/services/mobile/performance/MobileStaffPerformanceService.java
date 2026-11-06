package com.company.project.services.mobile.performance;

import com.company.project.dto.mobile.performance.StaffPerformanceResponseDTO;
import com.company.project.dto.mobile.performance.StaffPerformanceResponseDTO.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileStaffPerformanceService {

    private final StaffRepository staffRepository;
    private final LeadRepository leadRepository;
    private final FollowUpRepository followUpRepository;
    private final ReceiptRepository receiptRepository;
    private final WorkoutFeedbackRepository workoutFeedbackRepository;
    private final PerformanceEngine engine;

    public MobileStaffPerformanceService(
            StaffRepository staffRepository,
            LeadRepository leadRepository,
            FollowUpRepository followUpRepository,
            ReceiptRepository receiptRepository,
            WorkoutFeedbackRepository workoutFeedbackRepository,
            PerformanceEngine engine) {
        this.staffRepository = staffRepository;
        this.leadRepository = leadRepository;
        this.followUpRepository = followUpRepository;
        this.receiptRepository = receiptRepository;
        this.workoutFeedbackRepository = workoutFeedbackRepository;
        this.engine = engine;
    }

    public StaffPerformanceResponseDTO getStaffPerformance(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        // Accounts without a linked Staff record (e.g. Admin, gym owner) still get their own
        // performance computed off activity recorded under their login (receipts, leads and
        // follow-ups they created),
        // just without staff-only fields like a branch, monthly target, or leaderboard.
        Staff staff = staffRepository.findByUserId(principal.getId()).orElse(null);

        LocalDate today = LocalDate.now();
        int year = today.getYear();
        int month = today.getMonthValue();
        String monthLabel = today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year;

        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);

        // 1. Period
        PeriodDTO period = new PeriodDTO(year, month, monthLabel);

        // This month from the performance engine (only meaningful when linked to a Staff record).
        PeriodResult thisMonth = staff != null ? engine.evaluate(staff.getId(), java.time.YearMonth.of(year, month)) : null;

        // 2. Revenue Target & Achieved
        BigDecimal revenueAchieved = thisMonth != null ? thisMonth.revenue() : BigDecimal.ZERO;
        BigDecimal revenueGoal = thisMonth != null ? thisMonth.goal(Metric.REVENUE_TOTAL, Measure.AMOUNT) : null;
        BigDecimal revenueTarget = revenueGoal != null ? revenueGoal : BigDecimal.ZERO;
        int revenuePercentage = thisMonth != null && thisMonth.percent(Metric.REVENUE_TOTAL, Measure.AMOUNT) != null
                ? thisMonth.percent(Metric.REVENUE_TOTAL, Measure.AMOUNT) : 0;
        RevenueTargetDTO revenueTargetDTO = new RevenueTargetDTO(revenueAchieved, revenueTarget, revenuePercentage);

        // 3. Conversion Target & Achieved
        int conversionsAchieved = thisMonth != null ? (int) thisMonth.count(Metric.LEAD_CONVERSION) : 0;
        BigDecimal conversionGoal = thisMonth != null ? thisMonth.goal(Metric.LEAD_CONVERSION, Measure.COUNT) : null;
        int conversionTarget = conversionGoal != null ? conversionGoal.intValue() : 0;
        int conversionPercentage = conversionTarget > 0
                ? (int) Math.round(((double) conversionsAchieved / conversionTarget) * 100) : 0;
        ConversionTargetDTO conversionTargetDTO = new ConversionTargetDTO(conversionsAchieved, conversionTarget, conversionPercentage);

        // 4. Summary KPIs (Rating, Growth, Lead count)
        double rating = computeStaffRating(staff);
        int growthPercentage = computeGrowthPercentage(staff, principal.getUsername(), today, startOfMonth, conversionsAchieved, revenueAchieved);
        int leadCount = computeStaffLeadCount(staff, principal.getUsername());
        SummaryDTO summaryDTO = new SummaryDTO(rating, growthPercentage, leadCount);

        // 5. Six-Month Trend
        List<TrendItemDTO> trend = computeSixMonthTrend(staff, principal.getUsername(), today);

        // 6. Branch Leaderboard — only meaningful for an account linked to a Staff record
        List<LeaderboardItemDTO> leaderboard = staff != null
                ? computeBranchLeaderboard(staff, startOfMonth, startOfNextMonth)
                : new ArrayList<>();

        // 7. Performance Breakdown
        int conversionRate = staff != null ? engine.leadConversionRates(List.of(staff.getId())).getOrDefault(staff.getId(), 0) : 0;
        int followUpCompletion = computeFollowUpCompletion(staff, principal.getUsername());
        int customerSatisfaction = computeCustomerSatisfaction(rating);
        BreakdownDTO breakdown = new BreakdownDTO(conversionRate, followUpCompletion, customerSatisfaction);

        // 8. Motivation
        int remainingConversions = Math.max(conversionTarget - conversionsAchieved, 0);
        MotivationDTO motivation = generateMotivation(conversionsAchieved, conversionTarget, remainingConversions);

        return new StaffPerformanceResponseDTO(
                period,
                revenueTargetDTO,
                conversionTargetDTO,
                summaryDTO,
                trend,
                leaderboard,
                breakdown,
                motivation
        );
    }

    /** Revenue credited to the person in [start, end) — performance ledger, attributed by staff id. */
    private BigDecimal computeStaffRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        if (staff == null) return BigDecimal.ZERO;
        return engine.achievedBetween(staff.getId(), start, end).get(Metric.REVENUE_TOTAL).amountOrZero();
    }

    private int computeStaffConversions(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        if (staff == null) return 0;
        var a = engine.achievedBetween(staff.getId(), start, end).get(Metric.LEAD_CONVERSION);
        return a != null ? (int) a.count() : 0;
    }

    /**
     * Average rating members gave this trainer's sessions (trainer rating, else overall
     * satisfaction). Accounts without a Staff record have no sessions, so no rating — this used to
     * average every feedback in the gym, so each staff member saw the gym's score as their own.
     */
    private double computeStaffRating(Staff staff) {
        if (staff == null || staff.getId() == null) return 0.0;
        for (Object[] row : workoutFeedbackRepository.averageRatingByTrainerIds(List.of(staff.getId()))) {
            if (row[1] == null) continue;
            double avg = ((Number) row[1]).doubleValue();
            return BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP).doubleValue();
        }
        return 0.0;
    }

    /**
     * Month-to-date vs the same days of last month (revenue, else conversions). Comparing a month in
     * progress with the whole of last month always read as a drop early in the month, and the old
     * fallback returned the target's forecast, which isn't a growth figure at all. 0 = nothing to
     * compare with.
     */
    private int computeGrowthPercentage(
            Staff staff, String username, LocalDate today, LocalDateTime startOfMonth,
            int currentConversions, BigDecimal currentRevenue) {

        LocalDateTime startOfPrevMonth = startOfMonth.minusMonths(1);
        int daysSoFar = today.getDayOfMonth();
        int prevMonthDays = startOfPrevMonth.toLocalDate().lengthOfMonth();
        LocalDateTime endOfPrevPeriod = startOfPrevMonth.plusDays(Math.min(daysSoFar, prevMonthDays));

        BigDecimal prevRevenue = computeStaffRevenue(staff, username, startOfPrevMonth, endOfPrevPeriod);
        if (prevRevenue.compareTo(BigDecimal.ZERO) > 0) {
            double diff = currentRevenue.doubleValue() - prevRevenue.doubleValue();
            return (int) Math.round((diff / prevRevenue.doubleValue()) * 100);
        }

        int prevConversions = computeStaffConversions(staff, username, startOfPrevMonth, endOfPrevPeriod);
        if (prevConversions > 0) {
            double diff = currentConversions - prevConversions;
            return (int) Math.round((diff / (double) prevConversions) * 100);
        }

        return 0;
    }

    private int computeStaffLeadCount(Staff staff, String username) {
        if (staff != null) return (int) engine.leadCount(staff.getId());
        if (username == null || username.isBlank()) return 0;
        Specification<Lead> spec = (root, query, cb) -> cb.equal(root.get("createdBy"), username);
        return (int) leadRepository.count(spec);
    }

    private List<TrendItemDTO> computeSixMonthTrend(Staff staff, String username, LocalDate today) {
        List<TrendItemDTO> trends = new ArrayList<>();

        // Generate chronological 6 months (oldest to newest): today - 5 months ... today
        for (int i = 5; i >= 0; i--) {
            LocalDate monthDate = today.minusMonths(i);
            LocalDateTime monthStart = monthDate.withDayOfMonth(1).atStartOfDay();
            LocalDateTime monthEnd = monthStart.plusMonths(1);

            String periodStr = monthDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            String labelStr = monthDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

            int conversions = computeStaffConversions(staff, username, monthStart, monthEnd);
            BigDecimal revenue = computeStaffRevenue(staff, username, monthStart, monthEnd);

            trends.add(new TrendItemDTO(periodStr, labelStr, conversions, revenue));
        }

        return trends;
    }

    private List<LeaderboardItemDTO> computeBranchLeaderboard(Staff currentStaff, LocalDateTime startOfMonth, LocalDateTime startOfNextMonth) {
        List<Staff> branchStaffList;
        if (currentStaff.getBranch() != null && !currentStaff.getBranch().isBlank()) {
            Specification<Staff> spec = (root, query, cb) -> cb.equal(cb.lower(root.get("branch")), currentStaff.getBranch().toLowerCase());
            branchStaffList = staffRepository.findAll(spec);
        } else {
            branchStaffList = staffRepository.findAll();
        }

        if (branchStaffList.isEmpty()) {
            branchStaffList = Collections.singletonList(currentStaff);
        }

        // Everyone's month in one evaluation
        Map<Long, PeriodResult> results = engine.evaluate(branchStaffList.stream().map(Staff::getId).toList(),
                java.time.YearMonth.from(startOfMonth));
        List<LeaderboardItemDTO> items = new ArrayList<>();
        for (Staff s : branchStaffList) {
            PeriodResult r = results.get(s.getId());
            int conversions = r != null ? (int) r.count(Metric.LEAD_CONVERSION) : 0;
            BigDecimal revenue = r != null ? r.revenue() : BigDecimal.ZERO;

            boolean isCurrent = s.getId() != null && s.getId().equals(currentStaff.getId());
            items.add(new LeaderboardItemDTO(0, s.getId(), s.getName(), conversions, revenue, isCurrent));
        }

        // Sort deterministically: conversions DESC, revenue DESC, name ASC
        items.sort((a, b) -> {
            if (a.getConversionCount() != b.getConversionCount()) {
                return Integer.compare(b.getConversionCount(), a.getConversionCount());
            }
            int revCmp = b.getRevenue().compareTo(a.getRevenue());
            if (revCmp != 0) return revCmp;
            String nameA = a.getStaffName() != null ? a.getStaffName() : "";
            String nameB = b.getStaffName() != null ? b.getStaffName() : "";
            return nameA.compareToIgnoreCase(nameB);
        });

        // Assign 1-indexed ranks
        for (int i = 0; i < items.size(); i++) {
            items.get(i).setRank(i + 1);
        }

        return items;
    }

    public int computeFollowUpCompletion(Staff staff) {
        return computeFollowUpCompletion(staff, null);
    }

    /**
     * Share of follow-ups completed. A staff member's are the ones assigned to them by name; an
     * account with no Staff record (Admin) counts the follow-ups its own login created.
     */
    public int computeFollowUpCompletion(Staff staff, String username) {
        boolean hasName = staff != null && staff.getName() != null && !staff.getName().isBlank();
        Specification<FollowUp> staffFUSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasName) {
                predicates.add(cb.equal(root.get("assignedStaffId"), staff.getId()));
            } else if (username != null && !username.isBlank()) {
                predicates.add(cb.equal(root.get("createdBy"), username));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        long total = followUpRepository.count(staffFUSpec);
        if (total == 0) return 0;

        Specification<FollowUp> completedSpec = (root, query, cb) -> cb.and(
                cb.equal(root.get("status"), "completed"),
                staffFUSpec.toPredicate(root, query, cb));

        long completed = followUpRepository.count(completedSpec);
        return (int) Math.round(((double) completed / total) * 100);
    }

    private int computeCustomerSatisfaction(double rating) {
        if (rating <= 0.0) return 0;
        int satisfaction = (int) Math.round((rating / 5.0) * 100);
        return Math.min(100, Math.max(0, satisfaction));
    }

    private MotivationDTO generateMotivation(int achieved, int target, int remaining) {
        String status;
        String message;

        // Without a target there's nothing to have achieved (achieved >= 0 always held, so every
        // account with no target — including ones with no Staff record — was told it hit it).
        if (target <= 0) {
            return new MotivationDTO(0,
                    "No conversion target is set for this month yet. You have " + achieved + " conversion"
                            + (achieved == 1 ? "" : "s") + " so far — keep it going!",
                    "NO_TARGET");
        }

        if (achieved >= target) {
            status = "ACHIEVED";
            message = "Congratulations! You've achieved your monthly conversion target!";
        } else if (achieved >= (int) Math.ceil(target * 0.7)) {
            status = "ON_TRACK";
            message = "You need " + remaining + " more conversion" + (remaining == 1 ? "" : "s") + " to hit your target. You're on track to become this month's top performer!";
        } else if (achieved >= (int) Math.ceil(target * 0.4)) {
            status = "AHEAD";
            message = "You need " + remaining + " more conversion" + (remaining == 1 ? "" : "s") + " to hit your target. Keep pushing forward!";
        } else {
            status = "AT_RISK";
            message = "You need " + remaining + " more conversion" + (remaining == 1 ? "" : "s") + " to hit your target. Step up your follow-ups to boost conversions!";
        }

        return new MotivationDTO(remaining, message, status);
    }
}
