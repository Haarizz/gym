package com.company.project.services;

import com.company.project.entities.Shift;
import com.company.project.entities.ShiftAssignment;
import com.company.project.entities.ShiftRosterDay;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendanceCorrection;
import com.company.project.entities.StaffAttendanceDay;
import com.company.project.repositories.ShiftAssignmentRepository;
import com.company.project.repositories.ShiftRepository;
import com.company.project.repositories.ShiftRosterDayRepository;
import com.company.project.repositories.StaffAttendanceCorrectionRepository;
import com.company.project.repositories.StaffAttendanceDayRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.services.pos.PosBusinessDayService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Shift-based staff attendance. A day's record is computed, never stored: the shift comes
 * from a one-day roster change or the employee's shift assignment, the times from their
 * clock-ins (staff_attendance), and managers' decisions (leave/holiday overrides, overtime
 * approval) from staff_attendance_days. Rules:
 * <ul>
 *   <li>Late = clocked in after check-in + grace; counted from the scheduled check-in.</li>
 *   <li>Early departure = left before check-out - tolerance.</li>
 *   <li>Overtime = time worked after check-out, once it passes the shift's "OT starts after" minutes
 *       (early arrival never counts), capped at the shift's max daily OT; all of a worked day off is overtime.
 *       Policy "eligible" pays it automatically, "approval" only once approved, "none" never.</li>
 *   <li>Half day = under half the scheduled net hours worked.</li>
 *   <li>Absent = a scheduled day with no clock-in once the grace period has passed.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class ShiftAttendanceService {

    public static final List<String> DAY_NAMES = List.of("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");
    /** Manager-set day statuses that replace the computed one. */
    public static final List<String> DAY_STATUSES =
            List.of("Present", "Absent", "Half Day", "Paid Leave", "Unpaid Leave", "Holiday", "Weekly Off");
    private static final Set<String> WORKED = Set.of("Present", "Late", "Early Departure", "Overtime", "Working", "Incomplete Punch");

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final ShiftRosterDayRepository rosterRepository;
    private final StaffAttendanceDayRepository dayRepository;
    private final StaffAttendanceCorrectionRepository correctionRepository;
    private final StaffAttendanceRepository punchRepository;
    private final StaffRepository staffRepository;
    private final PosBusinessDayService businessDay;

    public ShiftAttendanceService(ShiftRepository shiftRepository, ShiftAssignmentRepository assignmentRepository,
                                  ShiftRosterDayRepository rosterRepository, StaffAttendanceDayRepository dayRepository,
                                  StaffAttendanceCorrectionRepository correctionRepository,
                                  StaffAttendanceRepository punchRepository, StaffRepository staffRepository,
                                  PosBusinessDayService businessDay) {
        this.shiftRepository = shiftRepository;
        this.assignmentRepository = assignmentRepository;
        this.rosterRepository = rosterRepository;
        this.dayRepository = dayRepository;
        this.correctionRepository = correctionRepository;
        this.punchRepository = punchRepository;
        this.staffRepository = staffRepository;
        this.businessDay = businessDay;
    }

    // ── Time zones ───────────────────────────────────────────────────────────
    // Clock-ins are stored on the server clock (UTC); shifts are the gym's wall-clock times.
    // The gym zone is the branch time zone from POS settings, else the browser's zone
    // (X-Client-Timezone), else UTC.

    public ZoneId zone() {
        return businessDay.zone();
    }

    /** Server-clock timestamp -> gym wall-clock time. */
    public LocalDateTime toLocal(LocalDateTime server) {
        return server == null ? null : server.atZone(ZoneId.systemDefault()).withZoneSameInstant(zone()).toLocalDateTime();
    }

    /** Gym wall-clock time -> server-clock timestamp (for storing corrected clock-ins). */
    public LocalDateTime toServer(LocalDateTime local) {
        return local == null ? null : local.atZone(zone()).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    public LocalDate today() {
        return LocalDate.now(zone());
    }

    public LocalDateTime now() {
        return LocalDateTime.now(zone());
    }

    // ── Shift maths ──────────────────────────────────────────────────────────

    public static boolean worksOn(Shift shift, LocalDate date) {
        String day = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
        return workDays(shift).contains(day);
    }

    public static List<String> workDays(Shift shift) {
        if (shift.getWorkDays() == null || shift.getWorkDays().isBlank()) return List.of();
        return Arrays.stream(shift.getWorkDays().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    /** Scheduled end; a check-out at or before check-in is on the next day. */
    public static LocalDateTime scheduledOut(Shift shift, LocalDate date) {
        LocalDate outDate = shift.getCheckOut().isAfter(shift.getCheckIn()) ? date : date.plusDays(1);
        return outDate.atTime(shift.getCheckOut());
    }

    public static int breakMinutes(Shift shift) {
        if (shift.getBreakStart() == null || shift.getBreakEnd() == null) return 0;
        long m = Duration.between(shift.getBreakStart(), shift.getBreakEnd()).toMinutes();
        return (int) (m < 0 ? m + 24 * 60 : m);
    }

    /** Net scheduled minutes per day (span minus break). */
    public static int netMinutes(Shift shift) {
        LocalDate d = LocalDate.of(2000, 1, 3);
        long span = Duration.between(d.atTime(shift.getCheckIn()), scheduledOut(shift, d)).toMinutes();
        return (int) Math.max(0, span - breakMinutes(shift));
    }

    private static LocalDateTime[] breakWindow(Shift shift, LocalDate date) {
        if (shift.getBreakStart() == null || shift.getBreakEnd() == null) return null;
        LocalDateTime start = shift.getBreakStart().isBefore(shift.getCheckIn())
                ? date.plusDays(1).atTime(shift.getBreakStart()) : date.atTime(shift.getBreakStart());
        LocalDateTime end = start.plusMinutes(breakMinutes(shift));
        return new LocalDateTime[] { start, end };
    }

    private static long overlapMinutes(LocalDateTime aStart, LocalDateTime aEnd, LocalDateTime bStart, LocalDateTime bEnd) {
        LocalDateTime s = aStart.isAfter(bStart) ? aStart : bStart;
        LocalDateTime e = aEnd.isBefore(bEnd) ? aEnd : bEnd;
        return e.isAfter(s) ? Duration.between(s, e).toMinutes() : 0;
    }

    // ── Context: everything needed to compute days for a date range ──────────

    /** Data for one date range, loaded once so computing many days stays a handful of queries. */
    public class Context {
        final Map<Long, Shift> shifts;
        final Map<Long, List<ShiftAssignment>> assignments;
        final Map<String, ShiftRosterDay> roster;
        final Map<String, StaffAttendanceDay> decisions;
        final Map<String, List<Punch>> punches;
        final Set<String> pendingCorrections;

        Context(LocalDate from, LocalDate to, boolean withAttendance) {
            shifts = shiftRepository.findAll().stream().collect(Collectors.toMap(Shift::getId, s -> s));
            assignments = assignmentRepository.findAll().stream()
                    .sorted(Comparator.comparing(ShiftAssignment::getEffectiveFrom).reversed())
                    .collect(Collectors.groupingBy(ShiftAssignment::getStaffId, LinkedHashMap::new, Collectors.toList()));
            roster = rosterRepository.findByWorkDateBetween(from, to).stream()
                    .collect(Collectors.toMap(r -> key(r.getStaffId(), r.getWorkDate()), r -> r, (a, b) -> a));
            if (withAttendance) {
                decisions = dayRepository.findByWorkDateBetween(from, to).stream()
                        .collect(Collectors.toMap(d -> key(d.getStaffId(), d.getWorkDate()), d -> d, (a, b) -> a));
                punches = punchRepository.findByDateRange(from.minusDays(1).atStartOfDay(), to.plusDays(2).atStartOfDay()).stream()
                        .map(p -> new Punch(p.getStaff().getId(), toLocal(p.getClockInTime()), toLocal(p.getClockOutTime())))
                        .collect(Collectors.groupingBy(p -> key(p.staffId(), p.in().toLocalDate())));
                pendingCorrections = correctionRepository.findAll().stream()
                        .filter(c -> "Pending".equals(c.getStatus()))
                        .map(c -> key(c.getStaffId(), c.getWorkDate()))
                        .collect(Collectors.toSet());
            } else {
                decisions = Map.of();
                punches = Map.of();
                pendingCorrections = Set.of();
            }
        }

        /** The shift assigned (by roster change or assignment) on a date; roster "off" = null shift. */
        public Resolved resolve(Long staffId, LocalDate date) {
            ShiftRosterDay r = roster.get(key(staffId, date));
            if (r != null) {
                Shift s = r.getShiftId() != null ? shifts.get(r.getShiftId()) : null;
                return new Resolved(s, s != null, true, s == null);
            }
            for (ShiftAssignment a : assignments.getOrDefault(staffId, List.of())) {
                if (!a.getEffectiveFrom().isAfter(date) && (a.getEffectiveTo() == null || !a.getEffectiveTo().isBefore(date))) {
                    Shift s = shifts.get(a.getShiftId());
                    if (s == null) break;
                    return new Resolved(s, worksOn(s, date), false, false);
                }
            }
            return new Resolved(null, false, false, false);
        }

        /** The employee's current assignment covering the date, ignoring one-day roster changes. */
        public Shift assignedShift(Long staffId, LocalDate date) {
            for (ShiftAssignment a : assignments.getOrDefault(staffId, List.of())) {
                if (!a.getEffectiveFrom().isAfter(date) && (a.getEffectiveTo() == null || !a.getEffectiveTo().isBefore(date))) {
                    return shifts.get(a.getShiftId());
                }
            }
            return null;
        }
    }

    /** A clock-in session in gym wall-clock time; out is null while still clocked in. */
    public record Punch(Long staffId, LocalDateTime in, LocalDateTime out) {}

    public record Resolved(Shift shift, boolean scheduled, boolean fromRoster, boolean rosterOff) {}

    public static String key(Long staffId, LocalDate date) { return staffId + "|" + date; }

    public Context context(LocalDate from, LocalDate to, boolean withAttendance) {
        return new Context(from, to, withAttendance);
    }

    // ── Daily records ────────────────────────────────────────────────────────

    public Map<String, Object> computeDay(Context ctx, Staff staff, LocalDate date, LocalDateTime now) {
        Resolved res = ctx.resolve(staff.getId(), date);
        Shift shift = res.shift();
        boolean scheduled = res.scheduled();
        StaffAttendanceDay decision = ctx.decisions.get(key(staff.getId(), date));
        List<Punch> punches = new ArrayList<>(ctx.punches.getOrDefault(key(staff.getId(), date), List.of()));
        punches.sort(Comparator.comparing(Punch::in));

        LocalDateTime schedIn = scheduled ? date.atTime(shift.getCheckIn()) : null;
        LocalDateTime schedOut = scheduled ? scheduledOut(shift, date) : null;
        int scheduledMinutes = scheduled ? netMinutes(shift) : 0;

        LocalDateTime actualIn = punches.isEmpty() ? null : punches.get(0).in();
        LocalDateTime actualOut = punches.stream().map(Punch::out)
                .filter(t -> t != null).max(Comparator.naturalOrder()).orElse(null);
        boolean open = punches.stream().anyMatch(p -> p.out() == null);

        int worked = 0;
        LocalDateTime[] brk = scheduled ? breakWindow(shift, date) : null;
        for (Punch p : punches) {
            if (p.out() == null) continue;
            long m = Duration.between(p.in(), p.out()).toMinutes();
            if (brk != null) m -= overlapMinutes(p.in(), p.out(), brk[0], brk[1]);
            worked += (int) Math.max(0, m);
        }

        int late = 0, early = 0, ot = 0;
        String policy = shift != null ? shift.getOvertimePolicy() : "none";
        if (scheduled && actualIn != null) {
            if (actualIn.isAfter(schedIn.plusMinutes(nz(shift.getGraceInMinutes())))) {
                late = (int) Duration.between(schedIn, actualIn).toMinutes();
            }
            if (actualOut != null && !open && actualOut.isBefore(schedOut.minusMinutes(nz(shift.getGraceOutMinutes())))) {
                early = (int) Duration.between(actualOut, schedOut).toMinutes();
            }
            // Staying past the threshold counts all the time after check-out; shorter overruns don't count.
            LocalDateTime otThreshold = schedOut.plusMinutes(nz(shift.getOtAfterMinutes()));
            if (actualOut != null && actualOut.isAfter(otThreshold)) {
                ot = (int) Duration.between(schedOut, actualOut).toMinutes();
            }
        } else if (!scheduled && shift != null && worked > 0) {
            ot = worked; // the whole of a worked day off
        }
        if (ot > 0 && shift != null && shift.getMaxDailyOtHours() != null) {
            ot = Math.min(ot, shift.getMaxDailyOtHours().multiply(BigDecimal.valueOf(60)).intValue());
        }
        if ("none".equals(policy)) ot = 0;

        String override = decision != null ? decision.getDayStatus() : null;
        boolean pastGrace = scheduled && now.isAfter(schedIn.plusMinutes(nz(shift.getGraceInMinutes())));
        String status;
        if (override != null && !override.isBlank()) {
            status = override;
        } else if (punches.isEmpty()) {
            if (!scheduled) status = shift == null && !res.rosterOff() ? "No Shift" : "Weekly Off";
            else status = pastGrace ? "Absent" : "Scheduled";
        } else if (open) {
            boolean stale = date.isBefore(now.toLocalDate().minusDays(1))
                    || (scheduled && now.isAfter(schedOut.plusHours(6)))
                    || (!scheduled && date.isBefore(now.toLocalDate()));
            status = stale ? "Incomplete Punch" : "Working";
        } else if (!scheduled) {
            status = ot > 0 ? "Overtime" : "Present";
        } else if (worked < scheduledMinutes / 2) {
            status = "Half Day";
        } else if (late > 0) {
            status = "Late"; // lateness is the exception to see; any overtime still shows and needs approval
        } else if (early > 0) {
            status = "Early Departure";
        } else if (ot > 0) {
            status = "Overtime";
        } else {
            status = "Present";
        }

        String approval;
        int approvedOt;
        if (decision != null && decision.getApprovalStatus() != null && (ot > 0 || "Incomplete Punch".equals(status))) {
            approval = decision.getApprovalStatus();
        } else if (ot > 0 && "approval".equals(policy)) {
            approval = "Pending";
        } else if ("Incomplete Punch".equals(status)) {
            approval = "Pending";
        } else if (override != null && !override.isBlank()) {
            approval = "Approved";
        } else {
            approval = "Auto-Approved";
        }
        if ("eligible".equals(policy)) {
            approvedOt = "Rejected".equals(approval) ? 0 : ot;
        } else if ("approval".equals(policy) && "Approved".equals(approval)) {
            Integer chosen = decision != null ? decision.getApprovedOtMinutes() : null;
            approvedOt = chosen != null ? Math.min(chosen, ot) : ot;
        } else {
            approvedOt = 0;
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", key(staff.getId(), date));
        m.put("staff_id", staff.getId());
        m.put("staff_code", staff.getStaffId());
        m.put("staff_name", staff.getName());
        m.put("role", staff.getRole());
        m.put("department", staff.getDepartment());
        m.put("photo_url", staff.getPhotoUrl());
        m.put("date", date.toString());
        m.put("shift_id", shift != null ? shift.getId() : null);
        m.put("shift_name", shift != null ? shift.getName() : null);
        m.put("shift_code", shift != null ? shift.getCode() : null);
        m.put("scheduled", scheduled);
        m.put("roster_change", res.fromRoster());
        m.put("scheduled_in", schedIn != null ? hhmm(schedIn.toLocalTime()) : null);
        m.put("scheduled_out", schedOut != null ? hhmm(schedOut.toLocalTime()) : null);
        m.put("actual_in", actualIn != null ? hhmm(actualIn.toLocalTime()) : null);
        m.put("actual_out", actualOut != null ? hhmm(actualOut.toLocalTime()) : null);
        m.put("break_minutes", scheduled ? breakMinutes(shift) : 0);
        m.put("scheduled_minutes", scheduledMinutes);
        m.put("worked_minutes", worked);
        m.put("late_minutes", late);
        m.put("early_minutes", early);
        m.put("ot_minutes", ot);
        m.put("approved_ot_minutes", approvedOt);
        m.put("overtime_policy", policy);
        m.put("status", status);
        m.put("status_override", override);
        m.put("approval_status", approval);
        m.put("note", decision != null ? decision.getNote() : null);
        m.put("punch_count", punches.size());
        m.put("pending_correction", ctx.pendingCorrections.contains(key(staff.getId(), date)));
        return m;
    }

    /** Staff counted by attendance and payroll: everyone not marked inactive. */
    public List<Staff> workforce() {
        return staffRepository.findAll(Sort.by("name")).stream()
                .filter(s -> s.getStatus() == null || !"inactive".equalsIgnoreCase(s.getStatus()))
                .toList();
    }

    public List<Map<String, Object>> dailyRecords(LocalDate from, LocalDate to, Long staffId) {
        Context ctx = context(from, to, true);
        LocalDateTime now = now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Staff s : workforce()) {
            if (staffId != null && !staffId.equals(s.getId())) continue;
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                rows.add(computeDay(ctx, s, d, now));
            }
        }
        rows.sort(Comparator.<Map<String, Object>, String>comparing(r -> (String) r.get("date")).reversed()
                .thenComparing(r -> String.valueOf(r.get("staff_name"))));
        return rows;
    }

    // ── Monthly summary (feeds payroll) ──────────────────────────────────────

    public List<Map<String, Object>> monthlySummary(YearMonth month) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        Context ctx = context(from, to, true);
        LocalDateTime now = now();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Staff s : workforce()) {
            List<Map<String, Object>> days = new ArrayList<>();
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) days.add(computeDay(ctx, s, d, now));
            Map<String, Object> row = summarize(days);
            Shift current = ctx.assignedShift(s.getId(), today().isBefore(to) ? today() : to);
            row.put("staff_id", s.getId());
            row.put("staff_code", s.getStaffId());
            row.put("staff_name", s.getName());
            row.put("role", s.getRole());
            row.put("department", s.getDepartment());
            row.put("photo_url", s.getPhotoUrl());
            row.put("shift_name", current != null ? current.getName() : null);
            out.add(row);
        }
        return out;
    }

    /** Totals for a set of computed days (one staff member, one month). */
    public static Map<String, Object> summarize(List<Map<String, Object>> days) {
        double scheduledDays = 0, present = 0, absent = 0, paidLeave = 0, unpaidLeave = 0, weeklyOff = 0, holidays = 0;
        int lateCount = 0, scheduledMin = 0, workedMin = 0, lateMin = 0, earlyMin = 0, regularMin = 0, otMin = 0, approvedOtMin = 0;
        int pendingOt = 0, incomplete = 0, upcoming = 0;
        for (Map<String, Object> d : days) {
            String status = (String) d.get("status");
            boolean scheduled = Boolean.TRUE.equals(d.get("scheduled"));
            int sched = (int) d.get("scheduled_minutes");
            int worked = (int) d.get("worked_minutes");
            workedMin += worked;
            lateMin += (int) d.get("late_minutes");
            earlyMin += (int) d.get("early_minutes");
            otMin += (int) d.get("ot_minutes");
            approvedOtMin += (int) d.get("approved_ot_minutes");
            if ((int) d.get("late_minutes") > 0) lateCount++;
            if ((int) d.get("ot_minutes") > 0 && "Pending".equals(d.get("approval_status"))) pendingOt++;
            switch (status) {
                case "Holiday" -> { holidays++; continue; }
                case "Weekly Off", "No Shift" -> { if ("Weekly Off".equals(status)) weeklyOff++; continue; }
                default -> { }
            }
            if (!scheduled && !"Paid Leave".equals(status) && !"Unpaid Leave".equals(status)
                    && !"Absent".equals(status) && !"Half Day".equals(status)) {
                continue; // worked an unscheduled day: hours and OT only
            }
            scheduledDays++;
            scheduledMin += sched;
            regularMin += Math.min(worked, sched);
            switch (status) {
                case "Paid Leave" -> paidLeave++;
                case "Unpaid Leave" -> unpaidLeave++;
                case "Absent" -> absent++;
                case "Half Day" -> { present += 0.5; absent += 0.5; }
                case "Scheduled" -> upcoming++;
                case "Incomplete Punch" -> { present++; incomplete++; }
                default -> { if (WORKED.contains(status)) present++; }
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("scheduled_days", scheduledDays);
        m.put("present", present);
        m.put("absent", absent);
        m.put("paid_leave", paidLeave);
        m.put("unpaid_leave", unpaidLeave);
        m.put("weekly_off", weeklyOff);
        m.put("holidays", holidays);
        m.put("upcoming_days", upcoming);
        m.put("late_count", lateCount);
        m.put("incomplete_punches", incomplete);
        m.put("pending_ot_days", pendingOt);
        m.put("scheduled_hours", hours(scheduledMin));
        m.put("actual_hours", hours(workedMin));
        m.put("late_hours", hours(lateMin));
        m.put("early_hours", hours(earlyMin));
        m.put("regular_hours", hours(regularMin));
        m.put("ot_hours", hours(otMin));
        m.put("approved_ot_hours", hours(approvedOtMin));
        double rateBase = scheduledDays - upcoming;
        m.put("attendance_rate", rateBase > 0 ? Math.round(present * 1000 / rateBase) / 10.0 : null);
        return m;
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    public static double hours(int minutes) {
        return Math.round(minutes / 60.0 * 100) / 100.0;
    }

    public static String hhmm(LocalTime t) {
        return String.format("%02d:%02d", t.getHour(), t.getMinute());
    }

    private static int nz(Integer v) { return v != null ? v : 0; }

    /** Daily records keyed by staff for payroll and the shifts page. */
    public Map<Long, List<Map<String, Object>>> daysByStaff(LocalDate from, LocalDate to) {
        Context ctx = context(from, to, true);
        LocalDateTime now = now();
        Map<Long, List<Map<String, Object>>> out = new HashMap<>();
        for (Staff s : workforce()) {
            List<Map<String, Object>> days = new ArrayList<>();
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) days.add(computeDay(ctx, s, d, now));
            out.put(s.getId(), days);
        }
        return out;
    }

    public List<StaffAttendanceCorrection> corrections() {
        return correctionRepository.findAllByOrderByCreatedAtDesc();
    }
}
