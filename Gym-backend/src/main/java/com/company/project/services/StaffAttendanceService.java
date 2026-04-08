package com.company.project.services;

import com.company.project.dto.StaffAttendanceDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendance;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.repositories.StaffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
public class StaffAttendanceService {

    private final StaffAttendanceRepository staffAttendanceRepository;
    private final StaffRepository staffRepository;

    public StaffAttendanceService(StaffAttendanceRepository staffAttendanceRepository,
                                  StaffRepository staffRepository) {
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.staffRepository           = staffRepository;
    }

    // ── Clock In ──────────────────────────────────────────────────────────────

    @Transactional
    public StaffAttendanceDTO clockIn(Long staffId, String deviceId) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + staffId));

        if (staffAttendanceRepository.existsByStaff_IdAndStatus(staffId, "working")) {
            throw new RuntimeException(staff.getName() + " is already clocked in");
        }

        StaffAttendance sa = new StaffAttendance();
        sa.setStaff(staff);
        sa.setClockInTime(LocalDateTime.now());
        sa.setStatus("working");
        sa.setDeviceId(deviceId != null ? deviceId : "WEB");
        staffAttendanceRepository.save(sa);

        return toDTO(sa);
    }

    // ── Clock Out ─────────────────────────────────────────────────────────────

    @Transactional
    public StaffAttendanceDTO clockOut(Long staffAttendanceId) {
        StaffAttendance sa = staffAttendanceRepository.findById(staffAttendanceId)
                .orElseThrow(() -> new RuntimeException("Staff attendance record not found: " + staffAttendanceId));

        if (!"working".equals(sa.getStatus())) {
            throw new RuntimeException("Staff member is not currently clocked in");
        }

        LocalDateTime now     = LocalDateTime.now();
        int minutes           = (int) Duration.between(sa.getClockInTime(), now).toMinutes();
        sa.setClockOutTime(now);
        sa.setTotalMinutes(minutes);
        sa.setStatus("completed");
        staffAttendanceRepository.save(sa);

        return toDTO(sa);
    }

    // ── Clock Out by staffId (convenience — clocks out the active session) ───

    @Transactional
    public StaffAttendanceDTO clockOutByStaffId(Long staffId) {
        StaffAttendance sa = staffAttendanceRepository
                .findByStaff_IdAndStatus(staffId, "working")
                .orElseThrow(() -> new RuntimeException("No active clock-in found for staff: " + staffId));
        return clockOut(sa.getId());
    }

    // ── Today's staff attendance ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StaffAttendanceDTO> getTodayAttendance() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end   = LocalDate.now().atTime(LocalTime.MAX);
        return staffAttendanceRepository.findByDateRange(start, end)
                .stream().map(this::toDTO).toList();
    }

    // ── Active status for a specific staff ───────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getActiveSession(Long staffId) {
        return staffAttendanceRepository
                .findByStaff_IdAndStatus(staffId, "working")
                .map(sa -> (Map<String, Object>) Map.of(
                        "active",    true,
                        "record",    toDTO(sa)
                ))
                .orElse(Map.of("active", false));
    }

    // ── Trainer report ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTrainerReport(String startDate, String endDate) {
        LocalDate start = startDate != null && !startDate.isBlank() ? LocalDate.parse(startDate) : LocalDate.now().minusDays(30);
        LocalDate end   = endDate   != null && !endDate.isBlank()   ? LocalDate.parse(endDate)   : LocalDate.now();

        List<StaffAttendance> records = staffAttendanceRepository.findByDateRange(
                start.atStartOfDay(), end.plusDays(1).atStartOfDay());

        Map<Long, List<StaffAttendance>> byStaff = records.stream()
                .collect(java.util.stream.Collectors.groupingBy(sa -> sa.getStaff().getId()));

        return byStaff.entrySet().stream()
                .map(e -> {
                    List<StaffAttendance> sr  = e.getValue();
                    Staff staff               = sr.get(0).getStaff();
                    long sessions             = sr.size();
                    java.util.OptionalDouble avgMin = sr.stream()
                            .filter(sa -> sa.getTotalMinutes() != null)
                            .mapToInt(StaffAttendance::getTotalMinutes).average();
                    long totalMin = sr.stream()
                            .filter(sa -> sa.getTotalMinutes() != null)
                            .mapToLong(StaffAttendance::getTotalMinutes).sum();
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id",               staff.getId());
                    m.put("name",             staff.getName());
                    m.put("role",             staff.getRole() != null ? staff.getRole() : "Staff");
                    m.put("department",       staff.getDepartment() != null ? staff.getDepartment() : "");
                    m.put("photoUrl",         staff.getPhotoUrl() != null ? staff.getPhotoUrl() : "");
                    m.put("sessions",         sessions);
                    m.put("totalMinutes",     totalMin);
                    m.put("avgSessionMinutes", avgMin.isPresent() ? Math.round(avgMin.getAsDouble()) : 0L);
                    return m;
                })
                .sorted(java.util.Comparator.comparingLong(m -> -((Long) m.get("sessions"))))
                .collect(java.util.stream.Collectors.toList());
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    public StaffAttendanceDTO toDTO(StaffAttendance sa) {
        StaffAttendanceDTO dto = new StaffAttendanceDTO();
        dto.setId(sa.getId());
        dto.setClockInTime(sa.getClockInTime());
        dto.setClockOutTime(sa.getClockOutTime());
        dto.setTotalMinutes(sa.getTotalMinutes());
        dto.setFormattedDuration(sa.getTotalMinutes() != null
                ? AttendanceService.formatDuration(sa.getTotalMinutes()) : null);
        dto.setStatus(sa.getStatus());
        dto.setDeviceId(sa.getDeviceId());
        Staff s = sa.getStaff();
        if (s != null) {
            dto.setStaffDbId(s.getId());
            dto.setStaffBizId(s.getStaffId());
            dto.setStaffName(s.getName());
            dto.setStaffRole(s.getRole());
            dto.setStaffDepartment(s.getDepartment());
        }
        return dto;
    }
}
