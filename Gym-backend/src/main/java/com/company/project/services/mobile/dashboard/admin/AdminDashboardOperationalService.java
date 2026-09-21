package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardOperationalHighlightDTO;
import com.company.project.entities.StaffAttendance;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Operational highlights: staff actually clocked in during the selected window,
 * and footfall (check-ins). There is no "expected staff" concept anywhere in the
 * schema (no shift-roster-with-headcount entity) — by explicit decision, this
 * shows only the real, clocked-in count rather than inventing a target to
 * compare it against.
 */
@Service
public class AdminDashboardOperationalService {

    private final StaffAttendanceRepository staffAttendanceRepository;
    private final AttendanceRepository attendanceRepository;

    public AdminDashboardOperationalService(StaffAttendanceRepository staffAttendanceRepository,
                                             AttendanceRepository attendanceRepository) {
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public List<AdminDashboardOperationalHighlightDTO> getOperationalHighlights(AdminDashboardFilterContext ctx) {
        AdminDashboardDateRange range = ctx.getDateRange();

        List<StaffAttendance> clockIns = staffAttendanceRepository.findByDateRange(range.getStart(), range.getEnd());
        long distinctStaffClockedIn = clockIns.stream()
                .map(sa -> sa.getStaff() != null ? sa.getStaff().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count();

        long footfall = attendanceRepository.countByDateRange(range.getStart(), range.getEnd());

        return List.of(
                new AdminDashboardOperationalHighlightDTO("Staff Clocked In", String.valueOf(distinctStaffClockedIn)),
                new AdminDashboardOperationalHighlightDTO("Footfall", String.valueOf(footfall))
        );
    }
}
