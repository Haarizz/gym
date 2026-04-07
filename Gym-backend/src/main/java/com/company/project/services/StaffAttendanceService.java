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
