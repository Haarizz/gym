package com.company.project.services;

import com.company.project.dto.StaffPerformanceMetricsDTO;
import com.company.project.dto.StaffSummaryDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendance;
import com.company.project.entities.StaffScheduleSlot;
import com.company.project.entities.StaffTarget;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.repositories.StaffBranchRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffTargetRepository;
import com.company.project.repositories.TrainingSessionRepository;
import com.company.project.repositories.WorkoutFeedbackRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Backs the admin Staff Management screen: branch headcount/attendance KPIs and a
 * current-month performance snapshot per staff member.
 */
@Service
@Transactional(readOnly = true)
public class StaffOverviewService {

    // Share of the month-to-date revenue pace a staff member must reach to count as ON_TRACK.
    private static final double ON_TRACK_PACE_RATIO = 0.9;

    private final StaffRepository staffRepository;
    private final StaffBranchRepository staffBranchRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final StaffTargetRepository staffTargetRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final WorkoutFeedbackRepository workoutFeedbackRepository;
    private final StaffProgressCalculator progressCalculator;

    public StaffOverviewService(StaffRepository staffRepository,
                                StaffBranchRepository staffBranchRepository,
                                StaffAttendanceRepository staffAttendanceRepository,
                                StaffTargetRepository staffTargetRepository,
                                TrainingSessionRepository trainingSessionRepository,
                                WorkoutFeedbackRepository workoutFeedbackRepository,
                                StaffProgressCalculator progressCalculator) {
        this.staffRepository           = staffRepository;
        this.staffBranchRepository     = staffBranchRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.staffTargetRepository     = staffTargetRepository;
        this.trainingSessionRepository = trainingSessionRepository;
        this.workoutFeedbackRepository = workoutFeedbackRepository;
        this.progressCalculator        = progressCalculator;
    }

    public StaffSummaryDTO getSummary() {
        List<Staff> staff = branchScopedStaff();
        Set<Long> activeIds = staff.stream()
                .filter(s -> "active".equalsIgnoreCase(s.getStatus()))
                .map(Staff::getId)
                .collect(Collectors.toSet());

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        long presentToday = staffAttendanceRepository.findByDateRange(startOfToday, startOfToday.plusDays(1)).stream()
                .map(a -> a.getStaff().getId())
                .filter(activeIds::contains)
                .distinct()
                .count();

        long total = staff.size();
        long active = activeIds.size();
        return new StaffSummaryDTO(total, active, total - active, presentToday, active - presentToday);
    }

    public List<StaffPerformanceMetricsDTO> getPerformance(Collection<Long> staffIds) {
        if (staffIds == null || staffIds.isEmpty()) return List.of();
        List<Staff> staffList = staffRepository.findAllById(staffIds);
        if (staffList.isEmpty()) return List.of();
        Set<Long> ids = staffList.stream().map(Staff::getId).collect(Collectors.toSet());

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDateTime startOfMonth = monthStart.atStartOfDay();
        LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);

        Map<Long, Integer> ptSessions = new HashMap<>();
        for (Object[] row : trainingSessionRepository.countPtSessionsByTrainerBetween(ids, monthStart, today.withDayOfMonth(today.lengthOfMonth()))) {
            ptSessions.put((Long) row[0], ((Number) row[1]).intValue());
        }

        Map<Long, double[]> ratings = new HashMap<>();
        for (Object[] row : workoutFeedbackRepository.averageRatingByTrainerIds(ids)) {
            ratings.put((Long) row[0], new double[]{((Number) row[1]).doubleValue(), ((Number) row[2]).doubleValue()});
        }

        Map<Long, Set<LocalDate>> daysPresent = new HashMap<>();
        for (StaffAttendance a : staffAttendanceRepository.findByDateRange(startOfMonth, startOfNextMonth)) {
            Long id = a.getStaff().getId();
            if (ids.contains(id)) {
                daysPresent.computeIfAbsent(id, k -> new HashSet<>()).add(a.getClockInTime().toLocalDate());
            }
        }

        // Fraction of the month elapsed, used to judge whether revenue is pacing to target.
        double monthElapsed = (double) today.getDayOfMonth() / today.lengthOfMonth();

        List<StaffPerformanceMetricsDTO> result = new ArrayList<>();
        for (Staff s : staffList) {
            String username = s.getAppUsername() != null ? s.getAppUsername() : "";
            StaffPerformanceMetricsDTO dto = new StaffPerformanceMetricsDTO();
            dto.setStaffId(String.valueOf(s.getId()));

            BigDecimal achieved = progressCalculator.computeRevenue(s, username, startOfMonth, startOfNextMonth);
            BigDecimal target = BigDecimal.ZERO;
            Optional<StaffTarget> targetOpt = staffTargetRepository
                    .findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(s.getId(), today.getYear(), today.getMonthValue())
                    .stream().findFirst();
            if (targetOpt.isPresent() && isPositive(targetOpt.get().getRevenueTarget())) {
                target = targetOpt.get().getRevenueTarget();
                BigDecimal recorded = targetOpt.get().getRevenueAchieved();
                if (recorded != null && recorded.compareTo(achieved) > 0) {
                    achieved = recorded;
                }
            } else if (isPositive(s.getMonthlyTarget())) {
                target = s.getMonthlyTarget();
            }
            int achievement = isPositive(target)
                    ? (int) Math.round(achieved.doubleValue() / target.doubleValue() * 100)
                    : 0;

            dto.setRevenueTarget(target);
            dto.setRevenueAchieved(achieved);
            dto.setAchievementPercentage(achievement);
            dto.setPerformanceStatus(performanceStatus(target, achievement, monthElapsed));
            dto.setConversionRate(progressCalculator.computeLeadConversionRate(s, username));
            dto.setPtSessions(ptSessions.getOrDefault(s.getId(), 0));

            Set<LocalDate> present = daysPresent.getOrDefault(s.getId(), Set.of());
            dto.setPresentToday(present.contains(today));
            dto.setAttendanceRate(attendanceRate(s, present, monthStart, today));

            double[] rating = ratings.get(s.getId());
            if (rating != null) {
                dto.setRating(BigDecimal.valueOf(rating[0]).setScale(1, RoundingMode.HALF_UP).doubleValue());
                dto.setRatingCount((int) rating[1]);
            }
            result.add(dto);
        }
        return result;
    }

    private List<Staff> branchScopedStaff() {
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        if (activeBranchId == null) return staffRepository.findAll();
        List<Long> allowedIds = staffBranchRepository.findStaffIdsByBranchId(activeBranchId);
        return allowedIds.isEmpty() ? List.of() : staffRepository.findAllById(allowedIds);
    }

    private static boolean isPositive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
    }

    private static String performanceStatus(BigDecimal target, int achievement, double monthElapsed) {
        if (!isPositive(target)) return StaffPerformanceMetricsDTO.NO_TARGET;
        if (achievement >= 100) return StaffPerformanceMetricsDTO.EXCELLENT;
        double expectedToDate = monthElapsed * 100;
        return achievement >= expectedToDate * ON_TRACK_PACE_RATIO
                ? StaffPerformanceMetricsDTO.ON_TRACK
                : StaffPerformanceMetricsDTO.AT_RISK;
    }

    /**
     * Month-to-date days present ÷ expected working days (0–100). Expected days are the
     * staff member's scheduled weekdays, or Mon–Sat when no schedule is set, counted from
     * the later of month start and join date. Today only counts once they have clocked in,
     * so the rate isn't penalised before their shift starts.
     */
    private static int attendanceRate(Staff staff, Set<LocalDate> present, LocalDate monthStart, LocalDate today) {
        Set<DayOfWeek> workDays = scheduledDays(staff);
        LocalDate from = staff.getJoinDate() != null && staff.getJoinDate().isAfter(monthStart)
                ? staff.getJoinDate()
                : monthStart;

        int expected = 0;
        for (LocalDate d = from; d.isBefore(today); d = d.plusDays(1)) {
            if (workDays.contains(d.getDayOfWeek())) expected++;
        }
        if (present.contains(today)) expected++;
        if (expected == 0) return 0;

        long daysPresent = present.stream().filter(d -> !d.isBefore(from) && !d.isAfter(today)).count();
        return (int) Math.min(100, Math.round(daysPresent * 100.0 / expected));
    }

    private static Set<DayOfWeek> scheduledDays(Staff staff) {
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        if (staff.getScheduleSlots() != null) {
            for (StaffScheduleSlot slot : staff.getScheduleSlots()) {
                if (slot.getDay() == null || slot.getDay().length() < 3) continue;
                String prefix = slot.getDay().substring(0, 3).toUpperCase(Locale.ROOT);
                for (DayOfWeek dow : DayOfWeek.values()) {
                    if (dow.name().startsWith(prefix)) days.add(dow);
                }
            }
        }
        if (days.isEmpty()) {
            days.addAll(EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.SATURDAY));
        }
        return days;
    }
}
