package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MembershipPlanRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;

/**
 * Usage rules applied on every member check-in (member app and staff/QR/kiosk),
 * on top of the membership status/expiry check:
 *
 *  1. Plan quota — MembershipPlan.attendanceLimit ("Sessions" / "Days" / "Hours")
 *     with attendanceValue per attendancePeriod ("Payment" / "Week" / "Month" / "Year").
 *     "Unlimited" (or no plan) skips this rule.
 *  2. Daily cap — at most {@link #MAX_CHECK_INS_PER_DAY} check-ins per calendar day.
 *  3. Cooldown — at least {@link #COOLDOWN_MINUTES} between the last check-out and
 *     the next check-in.
 *
 * Walk-ins are not members and are not subject to these rules.
 */
@Service
public class CheckInPolicyService {

    public static final int MAX_CHECK_INS_PER_DAY = 3;
    public static final int COOLDOWN_MINUTES = 120;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm a");

    private final AttendanceRepository attendanceRepository;
    private final MembershipPlanRepository membershipPlanRepository;

    public CheckInPolicyService(AttendanceRepository attendanceRepository,
                                MembershipPlanRepository membershipPlanRepository) {
        this.attendanceRepository = attendanceRepository;
        this.membershipPlanRepository = membershipPlanRepository;
    }

    /**
     * Snapshot of a member's check-in allowance.
     *
     * @param limitUnit   "Sessions" / "Days" / "Hours", or null when the plan is unlimited
     * @param limitValue  allowed amount per period, or null when unlimited
     * @param used        amount used in the current period (sessions, days or whole hours)
     * @param limitPeriod "Payment" / "Week" / "Month" / "Year", or null when unlimited
     * @param nextCheckInAllowedAt when the cooldown ends, or null if not cooling down
     * @param blockedReason why a check-in would be refused right now, or null if allowed
     */
    public record Allowance(String limitUnit,
                            Integer limitValue,
                            Integer used,
                            String limitPeriod,
                            int checkInsToday,
                            int maxCheckInsPerDay,
                            LocalDateTime nextCheckInAllowedAt,
                            String blockedReason) {
        public boolean canCheckIn() { return blockedReason == null; }
    }

    /** Throws if the member may not check in right now. */
    public void enforce(Member member) {
        Allowance allowance = evaluate(member);
        if (!allowance.canCheckIn()) {
            throw new BusinessRuleViolationException(allowance.blockedReason());
        }
    }

    public Allowance evaluate(Member member) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();

        MembershipPlan plan = resolvePlan(member);
        boolean limited = plan != null
                && plan.getAttendanceLimit() != null
                && !"Unlimited".equalsIgnoreCase(plan.getAttendanceLimit())
                && plan.getAttendanceValue() != null
                && plan.getAttendanceValue() > 0;

        LocalDateTime periodStart = limited ? periodStart(member, plan, now) : null;
        LocalDateTime fetchFrom = periodStart != null && periodStart.isBefore(startOfToday) ? periodStart : startOfToday;
        List<Attendance> recent = attendanceRepository.findMemberAttendanceSince(member.getId(), fetchFrom);

        int checkInsToday = (int) recent.stream()
                .filter(a -> !a.getCheckInTime().isBefore(startOfToday))
                .count();

        // Cooldown is measured from the latest check-out, which may be yesterday evening.
        LocalDateTime nextAllowed = attendanceRepository
                .findFirstByMember_IdAndCheckOutTimeIsNotNullOrderByCheckOutTimeDesc(member.getId())
                .map(a -> a.getCheckOutTime().plusMinutes(COOLDOWN_MINUTES))
                .filter(t -> t.isAfter(now))
                .orElse(null);

        String unit = null;
        Integer used = null;
        String blocked = null;

        if (limited) {
            unit = normaliseUnit(plan.getAttendanceLimit());
            List<Attendance> inPeriod = recent.stream()
                    .filter(a -> !a.getCheckInTime().isBefore(periodStart))
                    .toList();
            int limit = plan.getAttendanceValue();
            String periodLabel = periodLabel(plan.getAttendancePeriod());

            switch (unit) {
                case "Days" -> {
                    List<LocalDate> days = inPeriod.stream()
                            .map(a -> a.getCheckInTime().toLocalDate())
                            .distinct()
                            .toList();
                    used = days.size();
                    // A further visit today doesn't consume another day.
                    if (used >= limit && !days.contains(now.toLocalDate())) {
                        blocked = "You've used all " + limit + " gym days " + periodLabel + ".";
                    }
                }
                case "Hours" -> {
                    int minutes = inPeriod.stream()
                            .map(Attendance::getTotalMinutes)
                            .filter(Objects::nonNull)
                            .mapToInt(Integer::intValue)
                            .sum();
                    used = minutes / 60;
                    if (minutes >= limit * 60) {
                        blocked = "You've used all " + limit + " gym hours " + periodLabel + ".";
                    }
                }
                default -> {
                    used = inPeriod.size();
                    if (used >= limit) {
                        blocked = "You've used all " + limit + " sessions " + periodLabel + ".";
                    }
                }
            }
        }

        if (blocked == null && checkInsToday >= MAX_CHECK_INS_PER_DAY) {
            blocked = "Daily limit reached — you can check in up to " + MAX_CHECK_INS_PER_DAY
                    + " times a day. Please come back tomorrow.";
        }
        if (blocked == null && nextAllowed != null) {
            blocked = "Please wait between visits — you can check in again at "
                    + nextAllowed.format(TIME_FMT) + ".";
        }

        return new Allowance(
                unit,
                limited ? plan.getAttendanceValue() : null,
                used,
                limited ? plan.getAttendancePeriod() : null,
                checkInsToday,
                MAX_CHECK_INS_PER_DAY,
                nextAllowed,
                blocked);
    }

    private MembershipPlan resolvePlan(Member member) {
        if (member.getMembershipPlan() == null) return null;
        return membershipPlanRepository.findByName(member.getMembershipPlan()).orElse(null);
    }

    private static String normaliseUnit(String attendanceLimit) {
        if ("Days".equalsIgnoreCase(attendanceLimit)) return "Days";
        if ("Hours".equalsIgnoreCase(attendanceLimit)) return "Hours";
        // "Sessions" and the legacy "Limited" value both count check-ins.
        return "Sessions";
    }

    private static String periodLabel(String period) {
        if (period == null) return "on your current plan";
        return switch (period.toLowerCase()) {
            case "week" -> "this week";
            case "month" -> "this month";
            case "year" -> "this year";
            default -> "on your current plan";
        };
    }

    /**
     * Start of the window the quota is counted over. Calendar periods are clamped to
     * the membership start so usage before joining isn't counted.
     */
    private static LocalDateTime periodStart(Member member, MembershipPlan plan, LocalDateTime now) {
        String period = plan.getAttendancePeriod() == null ? "payment" : plan.getAttendancePeriod().toLowerCase();
        LocalDate today = now.toLocalDate();
        LocalDateTime calendarStart = switch (period) {
            case "week" -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
            case "month" -> today.withDayOfMonth(1).atStartOfDay();
            case "year" -> today.withDayOfYear(1).atStartOfDay();
            default -> null;
        };
        LocalDateTime memberStart = member.getMembershipStartDate();
        if (calendarStart != null) {
            return memberStart != null && memberStart.isAfter(calendarStart) ? memberStart : calendarStart;
        }
        LocalDateTime cycleStart = currentPaymentCycleStart(member, plan, now);
        if (cycleStart == null) return memberStart != null ? memberStart : LocalDateTime.of(2000, 1, 1, 0, 0);
        return memberStart != null && memberStart.isAfter(cycleStart) ? memberStart : cycleStart;
    }

    /**
     * Renewals extend the expiry by one plan duration from the current expiry, so a
     * member's paid time is a run of back-to-back cycles ending at the expiry. Walk
     * back from the expiry one plan duration at a time to find the cycle containing
     * {@code now}. Returns null when the plan duration or expiry is unknown.
     */
    private static LocalDateTime currentPaymentCycleStart(Member member, MembershipPlan plan, LocalDateTime now) {
        LocalDateTime cycleEnd = member.getExpiryDate() != null ? member.getExpiryDate() : member.getMembershipEndDate();
        if (cycleEnd == null) return null;
        for (int i = 0; i < 1000; i++) {
            LocalDateTime cycleStart = minusDuration(cycleEnd, plan);
            if (cycleStart == null || !cycleStart.isBefore(cycleEnd)) return null;
            if (!cycleStart.isAfter(now)) return cycleStart;
            cycleEnd = cycleStart;
        }
        return null;
    }

    /** Inverse of MemberService.computeExpiry. */
    private static LocalDateTime minusDuration(LocalDateTime end, MembershipPlan plan) {
        if (plan.getDurationValue() == null || plan.getDurationType() == null) return null;
        long val;
        try {
            val = Long.parseLong(plan.getDurationValue());
        } catch (NumberFormatException e) {
            return null;
        }
        if (val <= 0) return null;
        return switch (plan.getDurationType().toLowerCase()) {
            case "monthly", "months" -> end.minusMonths(val);
            case "annual", "annually", "years" -> end.minusYears(val);
            case "weekly", "weeks" -> end.minusWeeks(val);
            case "quarterly" -> end.minusMonths(val * 3);
            default -> end.minusDays(val);
        };
    }
}
