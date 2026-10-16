package com.company.project.services;

import com.company.project.entities.Shift;
import com.company.project.entities.ShiftAssignment;
import com.company.project.entities.ShiftRosterDay;
import com.company.project.entities.Staff;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ShiftAssignmentRepository;
import com.company.project.repositories.ShiftRepository;
import com.company.project.repositories.ShiftRosterDayRepository;
import com.company.project.repositories.StaffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Shift templates, who works which shift, and the day-by-day roster. */
@Service
@Transactional
public class ShiftService {

    private static final Set<String> TYPES = Set.of("fixed", "flexible", "rotational", "split", "overnight");
    private static final Set<String> STATUSES = Set.of("active", "draft", "inactive");
    private static final Set<String> OT_POLICIES = Set.of("eligible", "approval", "none");

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final ShiftRosterDayRepository rosterRepository;
    private final StaffRepository staffRepository;
    private final ShiftAttendanceService attendance;

    public ShiftService(ShiftRepository shiftRepository, ShiftAssignmentRepository assignmentRepository,
                        ShiftRosterDayRepository rosterRepository, StaffRepository staffRepository,
                        ShiftAttendanceService attendance) {
        this.shiftRepository = shiftRepository;
        this.assignmentRepository = assignmentRepository;
        this.rosterRepository = rosterRepository;
        this.staffRepository = staffRepository;
        this.attendance = attendance;
    }

    // ── Templates ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listShifts() {
        LocalDate today = attendance.today();
        ShiftAttendanceService.Context ctx = attendance.context(today, today, false);
        Map<Long, Long> assigned = attendance.workforce().stream()
                .map(s -> ctx.assignedShift(s.getId(), today))
                .filter(s -> s != null)
                .collect(Collectors.groupingBy(Shift::getId, Collectors.counting()));
        return shiftRepository.findAllByOrderByCheckInAsc().stream()
                .map(s -> toMap(s, assigned.getOrDefault(s.getId(), 0L)))
                .toList();
    }

    public Map<String, Object> createShift(Map<String, Object> body) {
        Shift s = new Shift();
        apply(s, body);
        return toMap(shiftRepository.save(s), 0L);
    }

    public Map<String, Object> updateShift(Long id, Map<String, Object> body) {
        Shift s = shiftRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Shift not found"));
        apply(s, body);
        return toMap(shiftRepository.save(s), 0L);
    }

    public Map<String, Object> duplicateShift(Long id) {
        Shift src = shiftRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Shift not found"));
        Shift s = new Shift();
        s.setName(src.getName() + " (Copy)");
        s.setCode(src.getCode() != null ? (src.getCode() + "2").substring(0, Math.min(6, src.getCode().length() + 1)) : null);
        s.setShiftType(src.getShiftType());
        s.setStatus("draft");
        s.setCheckIn(src.getCheckIn());
        s.setCheckOut(src.getCheckOut());
        s.setBreakStart(src.getBreakStart());
        s.setBreakEnd(src.getBreakEnd());
        s.setGraceInMinutes(src.getGraceInMinutes());
        s.setGraceOutMinutes(src.getGraceOutMinutes());
        s.setOtAfterMinutes(src.getOtAfterMinutes());
        s.setMaxDailyOtHours(src.getMaxDailyOtHours());
        s.setMaxWeeklyHours(src.getMaxWeeklyHours());
        s.setOvertimePolicy(src.getOvertimePolicy());
        s.setWorkDays(src.getWorkDays());
        s.setDepartments(src.getDepartments());
        s.setEffectiveFrom(src.getEffectiveFrom());
        s.setEffectiveTo(src.getEffectiveTo());
        return toMap(shiftRepository.save(s), 0L);
    }

    public void deleteShift(Long id) {
        Shift s = shiftRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Shift not found"));
        LocalDate today = attendance.today();
        boolean inUse = assignmentRepository.findByShiftId(id).stream()
                .anyMatch(a -> a.getEffectiveTo() == null || !a.getEffectiveTo().isBefore(today));
        if (inUse) {
            throw new BusinessRuleViolationException(
                    "\"" + s.getName() + "\" is assigned to employees. Reassign them or set the shift Inactive instead.");
        }
        shiftRepository.delete(s);
    }

    private void apply(Shift s, Map<String, Object> b) {
        String name = str(b.get("name"));
        if (b.containsKey("name")) {
            if (name == null) throw new BusinessRuleViolationException("Shift name is required");
            s.setName(name);
        }
        if (b.containsKey("code")) {
            String code = str(b.get("code"));
            s.setCode(code != null ? code.toUpperCase() : null);
        }
        if (b.containsKey("shift_type")) s.setShiftType(oneOf(str(b.get("shift_type")), TYPES, "fixed"));
        if (b.containsKey("status")) s.setStatus(oneOf(str(b.get("status")), STATUSES, "active"));
        if (b.containsKey("check_in")) s.setCheckIn(time(b.get("check_in")));
        if (b.containsKey("check_out")) s.setCheckOut(time(b.get("check_out")));
        if (b.containsKey("break_start")) s.setBreakStart(time(b.get("break_start")));
        if (b.containsKey("break_end")) s.setBreakEnd(time(b.get("break_end")));
        if (b.containsKey("grace_in_minutes")) s.setGraceInMinutes(intOr(b.get("grace_in_minutes"), 0));
        if (b.containsKey("grace_out_minutes")) s.setGraceOutMinutes(intOr(b.get("grace_out_minutes"), 0));
        if (b.containsKey("ot_after_minutes")) s.setOtAfterMinutes(intOr(b.get("ot_after_minutes"), 0));
        if (b.containsKey("max_daily_ot_hours")) s.setMaxDailyOtHours(dec(b.get("max_daily_ot_hours")));
        if (b.containsKey("max_weekly_hours")) s.setMaxWeeklyHours(dec(b.get("max_weekly_hours")));
        if (b.containsKey("overtime_policy")) s.setOvertimePolicy(oneOf(str(b.get("overtime_policy")), OT_POLICIES, "approval"));
        if (b.containsKey("work_days")) {
            Object wd = b.get("work_days");
            List<String> days = wd instanceof List<?> l ? l.stream().map(String::valueOf).toList()
                    : wd != null ? List.of(String.valueOf(wd).split(",")) : List.of();
            String joined = ShiftAttendanceService.DAY_NAMES.stream()
                    .filter(d -> days.stream().anyMatch(x -> x.trim().equalsIgnoreCase(d)))
                    .collect(Collectors.joining(","));
            if (joined.isEmpty()) throw new BusinessRuleViolationException("Pick at least one work day");
            s.setWorkDays(joined);
        }
        if (b.containsKey("departments")) {
            Object d = b.get("departments");
            s.setDepartments(d instanceof List<?> l ? l.stream().map(String::valueOf).collect(Collectors.joining(",")) : str(d));
        }
        if (b.containsKey("effective_from")) s.setEffectiveFrom(date(b.get("effective_from")));
        if (b.containsKey("effective_to")) s.setEffectiveTo(date(b.get("effective_to")));

        if (s.getName() == null) throw new BusinessRuleViolationException("Shift name is required");
        if (s.getCheckIn() == null || s.getCheckOut() == null) {
            throw new BusinessRuleViolationException("Check-in and check-out times are required");
        }
        if ((s.getBreakStart() == null) != (s.getBreakEnd() == null)) {
            throw new BusinessRuleViolationException("Give both a break start and a break end, or neither");
        }
        if (ShiftAttendanceService.netMinutes(s) <= 0) {
            throw new BusinessRuleViolationException("The break is as long as the shift — check the times");
        }
    }

    private Map<String, Object> toMap(Shift s, long assignedCount) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getName());
        m.put("code", s.getCode());
        m.put("shift_type", s.getShiftType());
        m.put("status", s.getStatus());
        m.put("check_in", ShiftAttendanceService.hhmm(s.getCheckIn()));
        m.put("check_out", ShiftAttendanceService.hhmm(s.getCheckOut()));
        m.put("break_start", s.getBreakStart() != null ? ShiftAttendanceService.hhmm(s.getBreakStart()) : null);
        m.put("break_end", s.getBreakEnd() != null ? ShiftAttendanceService.hhmm(s.getBreakEnd()) : null);
        m.put("grace_in_minutes", s.getGraceInMinutes());
        m.put("grace_out_minutes", s.getGraceOutMinutes());
        m.put("ot_after_minutes", s.getOtAfterMinutes());
        m.put("max_daily_ot_hours", s.getMaxDailyOtHours());
        m.put("max_weekly_hours", s.getMaxWeeklyHours());
        m.put("overtime_policy", s.getOvertimePolicy());
        m.put("work_days", ShiftAttendanceService.workDays(s));
        m.put("departments", s.getDepartments() == null || s.getDepartments().isBlank()
                ? List.of() : List.of(s.getDepartments().split(",")));
        m.put("effective_from", s.getEffectiveFrom() != null ? s.getEffectiveFrom().toString() : null);
        m.put("effective_to", s.getEffectiveTo() != null ? s.getEffectiveTo().toString() : null);
        m.put("overnight", !s.getCheckOut().isAfter(s.getCheckIn()));
        m.put("net_minutes", ShiftAttendanceService.netMinutes(s));
        m.put("break_minutes", ShiftAttendanceService.breakMinutes(s));
        m.put("assigned_count", assignedCount);
        return m;
    }

    // ── Assignments ──────────────────────────────────────────────────────────

    /** Each workforce member with the shift they work today (or on the given date). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> employeeSchedules(LocalDate on) {
        LocalDate day = on != null ? on : attendance.today();
        ShiftAttendanceService.Context ctx = attendance.context(day, day, false);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Staff s : attendance.workforce()) {
            Shift shift = ctx.assignedShift(s.getId(), day);
            ShiftAssignment current = assignmentRepository.findByStaffIdOrderByEffectiveFromDesc(s.getId()).stream()
                    .filter(a -> !a.getEffectiveFrom().isAfter(day) && (a.getEffectiveTo() == null || !a.getEffectiveTo().isBefore(day)))
                    .findFirst().orElse(null);
            ShiftAssignment upcoming = assignmentRepository.findByStaffIdOrderByEffectiveFromDesc(s.getId()).stream()
                    .filter(a -> a.getEffectiveFrom().isAfter(day))
                    .reduce((a, b) -> b).orElse(null);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("staff_id", s.getId());
            m.put("staff_code", s.getStaffId());
            m.put("name", s.getName());
            m.put("role", s.getRole());
            m.put("department", s.getDepartment());
            m.put("branch", s.getBranch());
            m.put("photo_url", s.getPhotoUrl());
            m.put("shift_id", shift != null ? shift.getId() : null);
            m.put("assignment_id", current != null ? current.getId() : null);
            m.put("effective_from", current != null ? current.getEffectiveFrom().toString() : null);
            m.put("effective_to", current != null && current.getEffectiveTo() != null ? current.getEffectiveTo().toString() : null);
            m.put("upcoming_shift_id", upcoming != null ? upcoming.getShiftId() : null);
            m.put("upcoming_from", upcoming != null ? upcoming.getEffectiveFrom().toString() : null);
            out.add(m);
        }
        return out;
    }

    /**
     * Puts the employees on a shift from effectiveFrom. Their earlier assignment ends the day
     * before; assignments that would have started inside the new range are replaced.
     */
    public int assign(Map<String, Object> body) {
        Long shiftId = longOrNull(body.get("shift_id"));
        Shift shift = shiftId != null ? shiftRepository.findById(shiftId).orElse(null) : null;
        if (shift == null) throw new BusinessRuleViolationException("Pick a shift to assign");
        LocalDate from = date(body.get("effective_from"));
        if (from == null) from = attendance.today();
        LocalDate to = date(body.get("effective_to"));
        if (to != null && to.isBefore(from)) throw new BusinessRuleViolationException("Effective To is before Effective From");
        List<Long> staffIds = ids(body.get("staff_ids"));
        if (staffIds.isEmpty()) throw new BusinessRuleViolationException("Select at least one employee");
        for (Long staffId : staffIds) {
            Staff staff = staffRepository.findById(staffId).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
            endAssignments(staff.getId(), from, to);
            ShiftAssignment a = new ShiftAssignment();
            a.setStaffId(staff.getId());
            a.setShiftId(shift.getId());
            a.setEffectiveFrom(from);
            a.setEffectiveTo(to);
            a.setBranchId(staff.getBranchId());
            assignmentRepository.save(a);
        }
        return staffIds.size();
    }

    /** Takes the employees off any shift from the given date. */
    public int unassign(Map<String, Object> body) {
        LocalDate from = date(body.get("effective_from"));
        if (from == null) from = attendance.today();
        List<Long> staffIds = ids(body.get("staff_ids"));
        for (Long staffId : staffIds) endAssignments(staffId, from, null);
        return staffIds.size();
    }

    private void endAssignments(Long staffId, LocalDate from, LocalDate to) {
        for (ShiftAssignment a : assignmentRepository.findByStaffIdOrderByEffectiveFromDesc(staffId)) {
            boolean startsInside = !a.getEffectiveFrom().isBefore(from) && (to == null || !a.getEffectiveFrom().isAfter(to));
            if (startsInside) {
                if (to != null && (a.getEffectiveTo() == null || a.getEffectiveTo().isAfter(to))) {
                    a.setEffectiveFrom(to.plusDays(1)); // resumes after the new range
                    assignmentRepository.save(a);
                } else {
                    assignmentRepository.delete(a);
                }
            } else if (a.getEffectiveFrom().isBefore(from)
                    && (a.getEffectiveTo() == null || !a.getEffectiveTo().isBefore(from))) {
                if (to != null && (a.getEffectiveTo() == null || a.getEffectiveTo().isAfter(to))) {
                    // the new range sits inside this one: split it around the new range
                    ShiftAssignment after = new ShiftAssignment();
                    after.setStaffId(a.getStaffId());
                    after.setShiftId(a.getShiftId());
                    after.setEffectiveFrom(to.plusDays(1));
                    after.setEffectiveTo(a.getEffectiveTo());
                    after.setBranchId(a.getBranchId());
                    assignmentRepository.save(after);
                }
                a.setEffectiveTo(from.minusDays(1));
                assignmentRepository.save(a);
            }
        }
    }

    // ── Roster ───────────────────────────────────────────────────────────────

    /** The shift (or day off) for every workforce member on every day of the range. */
    @Transactional(readOnly = true)
    public Map<String, Object> roster(LocalDate from, LocalDate to) {
        if (to.isBefore(from) || to.isAfter(from.plusDays(62))) {
            throw new BusinessRuleViolationException("Pick a roster range of up to two months");
        }
        ShiftAttendanceService.Context ctx = attendance.context(from, to, false);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Staff s : attendance.workforce()) {
            List<Map<String, Object>> days = new ArrayList<>();
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                ShiftAttendanceService.Resolved r = ctx.resolve(s.getId(), d);
                Map<String, Object> cell = new LinkedHashMap<>();
                cell.put("date", d.toString());
                cell.put("shift_id", r.shift() != null ? r.shift().getId() : null);
                cell.put("working", r.scheduled());
                cell.put("roster_change", r.fromRoster());
                days.add(cell);
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("staff_id", s.getId());
            row.put("name", s.getName());
            row.put("role", s.getRole());
            row.put("department", s.getDepartment());
            row.put("photo_url", s.getPhotoUrl());
            row.put("days", days);
            rows.add(row);
        }
        return Map.of("from", from.toString(), "to", to.toString(), "rows", rows);
    }

    /**
     * Changes one day: mode "shift" works shift_id that day, "off" makes it a day off,
     * "default" drops the change so the regular assignment applies again.
     */
    public void setRosterDay(Map<String, Object> body) {
        Long staffId = longOrNull(body.get("staff_id"));
        LocalDate day = date(body.get("date"));
        if (staffId == null || day == null) throw new BusinessRuleViolationException("staff_id and date are required");
        Staff staff = staffRepository.findById(staffId).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        String mode = str(body.get("mode"));
        ShiftRosterDay existing = rosterRepository.findByStaffIdAndWorkDate(staffId, day).orElse(null);
        if ("default".equals(mode)) {
            if (existing != null) rosterRepository.delete(existing);
            return;
        }
        Long shiftId = null;
        if (!"off".equals(mode)) {
            shiftId = longOrNull(body.get("shift_id"));
            if (shiftId == null || shiftRepository.findById(shiftId).isEmpty()) {
                throw new BusinessRuleViolationException("Pick a shift for this day");
            }
        }
        ShiftRosterDay r = existing != null ? existing : new ShiftRosterDay();
        r.setStaffId(staffId);
        r.setWorkDate(day);
        r.setShiftId(shiftId);
        if (r.getBranchId() == null) r.setBranchId(staff.getBranchId());
        rosterRepository.save(r);
    }

    /** Repeats last week's one-day roster changes in the week starting at weekStart. */
    public int copyPreviousWeek(LocalDate weekStart) {
        LocalDate monday = weekStart.with(DayOfWeek.MONDAY);
        LocalDate prevFrom = monday.minusDays(7);
        int copied = 0;
        for (ShiftRosterDay prev : rosterRepository.findByWorkDateBetween(prevFrom, prevFrom.plusDays(6))) {
            LocalDate target = prev.getWorkDate().plusDays(7);
            ShiftRosterDay r = rosterRepository.findByStaffIdAndWorkDate(prev.getStaffId(), target).orElseGet(ShiftRosterDay::new);
            r.setStaffId(prev.getStaffId());
            r.setWorkDate(target);
            r.setShiftId(prev.getShiftId());
            if (r.getBranchId() == null) r.setBranchId(prev.getBranchId());
            rosterRepository.save(r);
            copied++;
        }
        return copied;
    }

    // ── parsing helpers ──────────────────────────────────────────────────────

    static String str(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : s;
    }

    static LocalTime time(Object o) {
        String s = str(o);
        if (s == null) return null;
        if (s.equals("24:00")) return LocalTime.MIDNIGHT;
        try {
            return LocalTime.parse(s.length() == 5 ? s : s.substring(0, 5));
        } catch (Exception e) {
            throw new BusinessRuleViolationException("Invalid time: " + s);
        }
    }

    static LocalDate date(Object o) {
        String s = str(o);
        if (s == null) return null;
        try {
            return LocalDate.parse(s.length() > 10 ? s.substring(0, 10) : s);
        } catch (Exception e) {
            throw new BusinessRuleViolationException("Invalid date: " + s);
        }
    }

    static Integer intOr(Object o, int fallback) {
        String s = str(o);
        if (s == null) return fallback;
        try {
            return Math.max(0, (int) Double.parseDouble(s));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    static BigDecimal dec(Object o) {
        String s = str(o);
        if (s == null) return null;
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            throw new BusinessRuleViolationException("Invalid number: " + s);
        }
    }

    static Long longOrNull(Object o) {
        String s = str(o);
        if (s == null) return null;
        try {
            return Long.valueOf(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static List<Long> ids(Object o) {
        if (!(o instanceof List<?> l)) return List.of();
        return l.stream().map(ShiftService::longOrNull).filter(x -> x != null).distinct().toList();
    }

    private static String oneOf(String v, Set<String> allowed, String fallback) {
        if (v == null) return fallback;
        String lower = v.toLowerCase();
        if (!allowed.contains(lower)) throw new BusinessRuleViolationException("Unsupported value: " + v);
        return lower;
    }
}
