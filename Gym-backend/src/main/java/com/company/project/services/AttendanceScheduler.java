package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.StaffAttendance;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Runs at 00:01 every day to auto-close any sessions that were left open
 * (e.g. member forgot to check out, device went offline).
 * Sets checkOutTime = 23:59 of the session's start day.
 */
@Service
public class AttendanceScheduler {

    private final AttendanceRepository attendanceRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;

    public AttendanceScheduler(AttendanceRepository attendanceRepository,
                               StaffAttendanceRepository staffAttendanceRepository) {
        this.attendanceRepository      = attendanceRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
    }

    /** Runs at 00:01 every day */
    @Scheduled(cron = "0 1 0 * * *")
    @Transactional
    public void autoCloseOpenSessions() {
        LocalDateTime cutoff = LocalDate.now().atStartOfDay(); // start of today = end of yesterday

        // Close member sessions
        List<Attendance> openMember = attendanceRepository.findActiveSessionsBefore(cutoff);
        for (Attendance a : openMember) {
            LocalDateTime eod = a.getCheckInTime().toLocalDate().atTime(LocalTime.of(23, 59));
            int minutes = (int) java.time.Duration.between(a.getCheckInTime(), eod).toMinutes();
            a.setCheckOutTime(eod);
            a.setTotalMinutes(Math.max(minutes, 0));
            a.setStatus("completed");
            a.setNotes((a.getNotes() != null ? a.getNotes() + " | " : "") + "Auto-closed at midnight");
        }
        if (!openMember.isEmpty()) attendanceRepository.saveAll(openMember);

        // Close staff sessions
        List<StaffAttendance> openStaff = staffAttendanceRepository.findActiveSessionsBefore(cutoff);
        for (StaffAttendance sa : openStaff) {
            LocalDateTime eod = sa.getClockInTime().toLocalDate().atTime(LocalTime.of(23, 59));
            int minutes = (int) java.time.Duration.between(sa.getClockInTime(), eod).toMinutes();
            sa.setClockOutTime(eod);
            sa.setTotalMinutes(Math.max(minutes, 0));
            sa.setStatus("completed");
            sa.setNotes((sa.getNotes() != null ? sa.getNotes() + " | " : "") + "Auto-closed at midnight");
        }
        if (!openStaff.isEmpty()) staffAttendanceRepository.saveAll(openStaff);
    }
}
