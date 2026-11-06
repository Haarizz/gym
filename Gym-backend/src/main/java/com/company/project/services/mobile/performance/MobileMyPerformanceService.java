package com.company.project.services.mobile.performance;

import com.company.project.dto.mobile.performance.MyPerformanceResponseDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendance;
import com.company.project.entities.StaffScheduleSlot;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Backs the profile menu's "My Performance" screen. Unlike the role dashboards' performance
 * endpoints, this is a compact month-to-date snapshot that adapts to the caller's app role:
 * trainers are measured on sessions delivered, staff on lead conversions. Both share hours
 * worked, attendance and revenue. Ratings are deliberately absent — feedback is not yet
 * attributable to an individual staff member or trainer.
 */
@Service
@Transactional(readOnly = true)
public class MobileMyPerformanceService {

    private final StaffRepository staffRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final PerformanceEngine engine;

    public MobileMyPerformanceService(
            StaffRepository staffRepository,
            StaffAttendanceRepository staffAttendanceRepository,
            PerformanceEngine engine) {
        this.staffRepository = staffRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.engine = engine;
    }

    public MyPerformanceResponseDTO getMyPerformance(UserDetailsImpl principal, String role) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
        String username = principal.getUsername();
        boolean isTrainer = "trainer".equalsIgnoreCase(role);

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);
        LocalDateTime startOfPrevMonth = startOfMonth.minusMonths(1);

        java.time.YearMonth current = java.time.YearMonth.from(today);
        PeriodResult thisMonth = engine.evaluate(staff.getId(), current);
        PeriodResult lastMonth = engine.evaluate(staff.getId(), current.minusMonths(1));

        MyPerformanceResponseDTO dto = new MyPerformanceResponseDTO();
        dto.setRole(isTrainer ? "trainer" : "staff");
        dto.setPeriodLabel(today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + today.getYear());

        // Revenue (shared)
        BigDecimal revenueAchieved = thisMonth.revenue();
        BigDecimal revenueGoal = thisMonth.goal(Metric.REVENUE_TOTAL, Measure.AMOUNT);
        BigDecimal revenueTarget = revenueGoal != null ? revenueGoal : BigDecimal.ZERO;
        dto.setRevenueAchieved(revenueAchieved);
        dto.setRevenueTarget(revenueTarget);
        dto.setRevenueGrowth(growth(lastMonth.revenue().doubleValue(), revenueAchieved.doubleValue()));
        Integer revenuePct = thisMonth.percent(Metric.REVENUE_TOTAL, Measure.AMOUNT);

        // Hours & attendance (shared)
        List<StaffAttendance> attendance = staffAttendanceRepository
                .findByStaff_IdAndClockInTimeGreaterThanEqualAndClockInTimeLessThan(staff.getId(), startOfMonth, startOfNextMonth);
        dto.setHoursWorked(computeHoursWorked(attendance, now));
        int daysPresent = (int) attendance.stream()
                .map(a -> a.getClockInTime().toLocalDate())
                .distinct()
                .count();
        int daysScheduled = countScheduledDays(staff, today.withDayOfMonth(1), today);
        dto.setDaysPresent(daysPresent);
        dto.setDaysScheduled(daysScheduled);
        dto.setAttendanceRate(daysScheduled > 0 ? Math.min(100, percentage(daysPresent, daysScheduled)) : null);

        // Role-specific primary metric
        Integer primaryPct;
        if (isTrainer) {
            int completed = MobileTrainerPerformanceService.sessionsDelivered(thisMonth);
            int prevCompleted = MobileTrainerPerformanceService.sessionsDelivered(lastMonth);
            int target = MobileTrainerPerformanceService.sessionsGoal(thisMonth);
            primaryPct = target > 0 ? percentage(completed, target) : null;

            dto.setClassesCompleted(completed);
            dto.setSessionsTarget(target);
            dto.setSessionTargetPercentage(primaryPct);
            dto.setSessionGrowth(growth(prevCompleted, completed));
            dto.setMessage(buildMessage(completed, target, "session", dto.getPeriodLabel()));
        } else {
            int converted = (int) thisMonth.count(Metric.LEAD_CONVERSION);
            int prevConverted = (int) lastMonth.count(Metric.LEAD_CONVERSION);
            BigDecimal goal = thisMonth.goal(Metric.LEAD_CONVERSION, Measure.COUNT);
            int target = goal != null ? goal.intValue() : 0;
            primaryPct = target > 0 ? percentage(converted, target) : null;

            dto.setLeadsConverted(converted);
            dto.setConversionTarget(target);
            dto.setConversionRate(engine.leadConversionRates(List.of(staff.getId())).getOrDefault(staff.getId(), 0));
            dto.setConversionGrowth(growth(prevConverted, converted));
            dto.setFollowUpCompletion(engine.followUpCompletion(staff.getId()));
            dto.setMessage(buildMessage(converted, target, "conversion", dto.getPeriodLabel()));
        }

        dto.setPerformanceScore(averageScore(primaryPct, revenuePct, dto.getAttendanceRate()));
        return dto;
    }

    private double computeHoursWorked(List<StaffAttendance> attendance, LocalDateTime now) {
        long minutes = 0;
        for (StaffAttendance a : attendance) {
            if (a.getTotalMinutes() != null) {
                minutes += a.getTotalMinutes();
            } else if (a.getClockOutTime() == null && a.getClockInTime() != null) {
                // Still clocked in — count the shift so far.
                minutes += Math.max(0, Duration.between(a.getClockInTime(), now).toMinutes());
            }
        }
        return Math.round(minutes / 6.0) / 10.0;
    }

    /** Days from {@code from} to {@code to} (inclusive) that fall on one of the staff's scheduled weekdays. */
    private int countScheduledDays(Staff staff, LocalDate from, LocalDate to) {
        Set<DayOfWeek> workDays = EnumSet.noneOf(DayOfWeek.class);
        for (StaffScheduleSlot slot : staff.getScheduleSlots()) {
            DayOfWeek day = parseDay(slot.getDay());
            if (day != null) workDays.add(day);
        }
        if (workDays.isEmpty()) return 0;

        int count = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (workDays.contains(d.getDayOfWeek())) count++;
        }
        return count;
    }

    private DayOfWeek parseDay(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String key = raw.trim().toLowerCase(Locale.ENGLISH);
        for (DayOfWeek day : DayOfWeek.values()) {
            String full = day.getDisplayName(TextStyle.FULL, Locale.ENGLISH).toLowerCase(Locale.ENGLISH);
            if (full.equals(key) || (key.length() >= 3 && full.startsWith(key))) return day;
        }
        return null;
    }

    private String buildMessage(int achieved, int target, String unit, String periodLabel) {
        String plural = achieved == 1 ? unit : unit + "s";
        if (target <= 0) {
            return "You've recorded " + achieved + " " + plural + " so far in " + periodLabel
                    + ". Ask your manager to set a monthly target to track your progress.";
        }
        if (achieved >= target) {
            return "You've hit your " + periodLabel + " target of " + target + " " + unit + "s. Great work!";
        }
        int remaining = target - achieved;
        return "You've completed " + achieved + " of " + target + " " + unit + "s this month — "
                + remaining + " more to hit your target.";
    }

    private Integer averageScore(Integer... components) {
        List<Integer> present = new ArrayList<>();
        for (Integer c : components) {
            if (c != null) present.add(Math.min(100, c));
        }
        if (present.isEmpty()) return null;
        return (int) Math.round(present.stream().collect(Collectors.averagingInt(Integer::intValue)));
    }

    /** Month-over-month change in percent; null when there was no previous activity to compare against. */
    private Integer growth(double previous, double current) {
        if (previous <= 0) return null;
        return (int) Math.round(((current - previous) / previous) * 100);
    }

    private int percentage(double achieved, double target) {
        return (int) Math.round((achieved / target) * 100);
    }

    private boolean isPositive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
    }
}
