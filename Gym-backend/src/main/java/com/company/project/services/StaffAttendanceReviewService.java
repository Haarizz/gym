package com.company.project.services;

import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendance;
import com.company.project.entities.StaffAttendanceCorrection;
import com.company.project.entities.StaffAttendanceDay;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.StaffAttendanceCorrectionRepository;
import com.company.project.repositories.StaffAttendanceDayRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.repositories.StaffRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Manager actions on staff attendance: day decisions and correction requests. */
@Service
@Transactional
public class StaffAttendanceReviewService {

    private final StaffAttendanceDayRepository dayRepository;
    private final StaffAttendanceCorrectionRepository correctionRepository;
    private final StaffAttendanceRepository punchRepository;
    private final StaffRepository staffRepository;
    private final ShiftAttendanceService attendance;

    public StaffAttendanceReviewService(StaffAttendanceDayRepository dayRepository,
                                        StaffAttendanceCorrectionRepository correctionRepository,
                                        StaffAttendanceRepository punchRepository, StaffRepository staffRepository,
                                        ShiftAttendanceService attendance) {
        this.dayRepository = dayRepository;
        this.correctionRepository = correctionRepository;
        this.punchRepository = punchRepository;
        this.staffRepository = staffRepository;
        this.attendance = attendance;
    }

    /**
     * Records a decision on a staff member's day. approval_status Approved/Rejected decides the
     * overtime (approved_ot_minutes optionally approves only part of it); day_status sets a leave,
     * holiday or other override ("" clears it).
     */
    public void decide(Map<String, Object> body) {
        Long staffId = ShiftService.longOrNull(body.get("staff_id"));
        LocalDate day = ShiftService.date(body.get("date"));
        if (staffId == null || day == null) throw new BusinessRuleViolationException("staff_id and date are required");
        Staff staff = staffRepository.findById(staffId).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        StaffAttendanceDay d = dayRepository.findByStaffIdAndWorkDate(staffId, day).orElseGet(StaffAttendanceDay::new);
        d.setStaffId(staffId);
        d.setWorkDate(day);
        if (d.getBranchId() == null) d.setBranchId(staff.getBranchId());
        if (body.containsKey("approval_status")) {
            String a = ShiftService.str(body.get("approval_status"));
            if (a != null && !List.of("Approved", "Rejected").contains(a)) {
                throw new BusinessRuleViolationException("approval_status must be Approved or Rejected");
            }
            d.setApprovalStatus(a);
        }
        if (body.containsKey("approved_ot_minutes")) {
            Object v = body.get("approved_ot_minutes");
            d.setApprovedOtMinutes(v == null || ShiftService.str(v) == null ? null : ShiftService.intOr(v, 0));
        }
        if (body.containsKey("day_status")) {
            String s = ShiftService.str(body.get("day_status"));
            if (s != null && !ShiftAttendanceService.DAY_STATUSES.contains(s)) {
                throw new BusinessRuleViolationException("Unsupported day status: " + s);
            }
            d.setDayStatus(s);
        }
        if (body.containsKey("note")) d.setNote(ShiftService.str(body.get("note")));
        d.setReviewedBy(currentUser());
        d.setReviewedAt(LocalDateTime.now());
        if (d.getDayStatus() == null && d.getApprovalStatus() == null && d.getNote() == null) {
            if (d.getId() != null) dayRepository.delete(d);
            return;
        }
        dayRepository.save(d);
    }

    /** Bulk version of decide() for the "approve all pending overtime" action. */
    public int decideMany(List<Map<String, Object>> items) {
        items.forEach(this::decide);
        return items.size();
    }

    // ── Corrections ──────────────────────────────────────────────────────────

    public List<Map<String, Object>> listCorrections() {
        Map<Long, Staff> staff = new LinkedHashMap<>();
        staffRepository.findAll().forEach(s -> staff.put(s.getId(), s));
        return correctionRepository.findAllByOrderByCreatedAtDesc().stream().map(c -> {
            Staff s = staff.get(c.getStaffId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("staff_id", c.getStaffId());
            m.put("staff_name", s != null ? s.getName() : "Unknown");
            m.put("staff_code", s != null ? s.getStaffId() : null);
            m.put("role", s != null ? s.getRole() : null);
            m.put("photo_url", s != null ? s.getPhotoUrl() : null);
            m.put("date", c.getWorkDate().toString());
            m.put("check_in", c.getCheckIn() != null ? ShiftAttendanceService.hhmm(c.getCheckIn()) : null);
            m.put("check_out", c.getCheckOut() != null ? ShiftAttendanceService.hhmm(c.getCheckOut()) : null);
            m.put("day_status", c.getDayStatus());
            m.put("reason", c.getReason());
            m.put("status", c.getStatus());
            m.put("review_note", c.getReviewNote());
            m.put("requested_by", c.getCreatedBy());
            m.put("requested_at", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
            m.put("reviewed_by", c.getReviewedBy());
            m.put("reviewed_at", c.getReviewedAt() != null ? c.getReviewedAt().toString() : null);
            return m;
        }).toList();
    }

    public Map<String, Object> requestCorrection(Map<String, Object> body) {
        Long staffId = ShiftService.longOrNull(body.get("staff_id"));
        LocalDate day = ShiftService.date(body.get("date"));
        if (staffId == null || day == null) throw new BusinessRuleViolationException("Pick an employee and a date");
        if (day.isAfter(attendance.today())) throw new BusinessRuleViolationException("Attendance can't be entered for a future date");
        Staff staff = staffRepository.findById(staffId).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        LocalTime in = ShiftService.time(body.get("check_in"));
        LocalTime out = ShiftService.time(body.get("check_out"));
        String dayStatus = ShiftService.str(body.get("day_status"));
        if (dayStatus != null && !ShiftAttendanceService.DAY_STATUSES.contains(dayStatus)) {
            throw new BusinessRuleViolationException("Unsupported day status: " + dayStatus);
        }
        if (in == null && out == null && dayStatus == null) {
            throw new BusinessRuleViolationException("Enter corrected times or a day status");
        }
        String reason = ShiftService.str(body.get("reason"));
        if (reason == null) throw new BusinessRuleViolationException("Give a reason for the correction");
        StaffAttendanceCorrection c = new StaffAttendanceCorrection();
        c.setStaffId(staffId);
        c.setWorkDate(day);
        c.setCheckIn(in);
        c.setCheckOut(out);
        c.setDayStatus(dayStatus);
        c.setReason(reason);
        c.setStatus("Pending");
        c.setBranchId(staff.getBranchId());
        correctionRepository.save(c);
        return Map.of("id", c.getId(), "status", c.getStatus());
    }

    public void reviewCorrection(Long id, boolean approve, String note) {
        StaffAttendanceCorrection c = correctionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Correction not found"));
        if (!"Pending".equals(c.getStatus())) throw new BusinessRuleViolationException("This correction was already " + c.getStatus().toLowerCase());
        if (approve) apply(c);
        c.setStatus(approve ? "Approved" : "Rejected");
        c.setReviewNote(note);
        c.setReviewedBy(currentUser());
        c.setReviewedAt(LocalDateTime.now());
        correctionRepository.save(c);
    }

    public void cancelCorrection(Long id) {
        StaffAttendanceCorrection c = correctionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Correction not found"));
        if (!"Pending".equals(c.getStatus())) throw new BusinessRuleViolationException("Only pending corrections can be withdrawn");
        correctionRepository.delete(c);
    }

    /** Writes an approved correction into the clock-ins (and the day's status override). */
    private void apply(StaffAttendanceCorrection c) {
        Staff staff = staffRepository.findById(c.getStaffId()).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        LocalDate day = c.getWorkDate();
        if (c.getCheckIn() != null || c.getCheckOut() != null) {
            List<StaffAttendance> punches = punchRepository
                    .findByStaff_IdAndClockInTimeGreaterThanEqualAndClockInTimeLessThan(
                            staff.getId(), attendance.toServer(day.atStartOfDay()), attendance.toServer(day.plusDays(1).atStartOfDay()))
                    .stream().sorted(Comparator.comparing(StaffAttendance::getClockInTime)).toList();
            if (punches.isEmpty()) {
                if (c.getCheckIn() == null || c.getCheckOut() == null) {
                    throw new BusinessRuleViolationException("There is no clock-in that day — enter both check-in and check-out");
                }
                StaffAttendance p = new StaffAttendance();
                p.setStaff(staff);
                p.setDeviceId("MANUAL");
                p.setNotes("Manual entry: " + c.getReason());
                p.setBranchId(staff.getBranchId());
                setTimes(p, attendance.toServer(day.atTime(c.getCheckIn())), attendance.toServer(outFor(day, c.getCheckIn(), c.getCheckOut())));
                punchRepository.save(p);
            } else {
                StaffAttendance first = punches.get(0);
                StaffAttendance last = punches.get(punches.size() - 1);
                // Corrections are entered in gym time; clock-ins are stored on the server clock.
                LocalDateTime in = c.getCheckIn() != null ? day.atTime(c.getCheckIn()) : attendance.toLocal(first.getClockInTime());
                if (c.getCheckIn() != null) setTimes(first, attendance.toServer(in), first.getClockOutTime());
                if (c.getCheckOut() != null) {
                    LocalTime lastIn = attendance.toLocal(last.getClockInTime()).toLocalTime();
                    setTimes(last, last.getClockInTime(), attendance.toServer(outFor(day, last == first ? in.toLocalTime() : lastIn, c.getCheckOut())));
                }
                String note = "Corrected: " + c.getReason();
                first.setNotes(first.getNotes() != null ? first.getNotes() + "\n" + note : note);
                punchRepository.save(first);
                if (last != first) punchRepository.save(last);
            }
        }
        if (c.getDayStatus() != null) {
            StaffAttendanceDay d = dayRepository.findByStaffIdAndWorkDate(staff.getId(), day).orElseGet(StaffAttendanceDay::new);
            d.setStaffId(staff.getId());
            d.setWorkDate(day);
            d.setDayStatus(c.getDayStatus());
            if (d.getBranchId() == null) d.setBranchId(staff.getBranchId());
            d.setReviewedBy(currentUser());
            d.setReviewedAt(LocalDateTime.now());
            dayRepository.save(d);
        }
    }

    private static LocalDateTime outFor(LocalDate day, LocalTime in, LocalTime out) {
        return out.isAfter(in) ? day.atTime(out) : day.plusDays(1).atTime(out);
    }

    private static void setTimes(StaffAttendance p, LocalDateTime in, LocalDateTime out) {
        p.setClockInTime(in);
        p.setClockOutTime(out);
        if (out != null) {
            if (!out.isAfter(in)) throw new BusinessRuleViolationException("Check-out must be after check-in");
            p.setTotalMinutes((int) Duration.between(in, out).toMinutes());
            p.setStatus("completed");
        }
    }

    static String currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}
