package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.StaffAttendance;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * One place that closes member visits, so every path (member app, web check-out,
 * the midnight job, and the auto-close on a fresh check-in) records the same thing.
 *
 * A visit still open from an earlier day ("stale" — the member forgot to check out)
 * is closed at check-in + {@link #STALE_SESSION_MAX_MINUTES}, not at the time someone
 * notices, so a forgotten check-out doesn't burn a whole day of an "Hours" plan.
 */
@Service
public class AttendanceSessionService {

    public static final int STALE_SESSION_MAX_MINUTES = 180;

    private final AttendanceRepository attendanceRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;

    public AttendanceSessionService(AttendanceRepository attendanceRepository,
                                    StaffAttendanceRepository staffAttendanceRepository) {
        this.attendanceRepository = attendanceRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
    }

    /** The member's open visit, if any — including one left open from an earlier day. */
    public Optional<Attendance> findActiveSession(Long memberId) {
        return attendanceRepository.findFirstByMember_IdAndStatusOrderByCheckInTimeDesc(memberId, "active");
    }

    /** True when the visit started before today, i.e. the member never checked out. */
    public static boolean isStale(Attendance a) {
        return a.getCheckInTime() != null
                && a.getCheckInTime().isBefore(LocalDate.now().atStartOfDay());
    }

    /** When a stale visit is recorded as ending: capped length, and never in the future. */
    public static LocalDateTime staleCloseTime(Attendance a) {
        LocalDateTime capped = a.getCheckInTime().plusMinutes(STALE_SESSION_MAX_MINUTES);
        LocalDateTime now = LocalDateTime.now();
        return capped.isAfter(now) ? now : capped;
    }

    /**
     * Closes the visit at {@code at} (or at the stale cap when it's from an earlier day),
     * ending a running workout at the same time. Does not save.
     */
    public void close(Attendance a, LocalDateTime at) {
        boolean stale = isStale(a);
        LocalDateTime end = stale ? staleCloseTime(a) : at;
        if (a.getWorkoutStartTime() != null && a.getWorkoutEndTime() == null) {
            LocalDateTime workoutEnd = end.isBefore(a.getWorkoutStartTime()) ? a.getWorkoutStartTime() : end;
            endWorkout(a, workoutEnd);
        }
        if (a.getBreakStartTime() != null) endBreak(a, end);
        int breakMinutes = a.getBreakMinutes() != null ? a.getBreakMinutes() : 0;
        a.setCheckOutTime(end);
        a.setTotalMinutes((int) Math.max(Duration.between(a.getCheckInTime(), end).toMinutes() - breakMinutes, 0));
        a.setStatus("completed");
        if (stale) {
            a.setNotes((a.getNotes() != null ? a.getNotes() + " | " : "")
                    + "No check-out — auto-closed after " + (STALE_SESSION_MAX_MINUTES / 60) + "h");
        }
    }

    /**
     * Ends the visit's workout at {@code at}. Does not save. The member app no longer
     * starts workouts; this only closes one left running from before that change.
     */
    public static void endWorkout(Attendance a, LocalDateTime at) {
        a.setWorkoutEndTime(at);
        a.setWorkoutMinutes((int) Math.max(Duration.between(a.getWorkoutStartTime(), at).toMinutes(), 0));
    }

    /** Ends the visit's running break at {@code at}, adding it to breakMinutes. Does not save. */
    public static void endBreak(Attendance a, LocalDateTime at) {
        LocalDateTime start = a.getBreakStartTime();
        int minutes = start.isAfter(at) ? 0 : (int) Duration.between(start, at).toMinutes();
        a.setBreakMinutes((a.getBreakMinutes() != null ? a.getBreakMinutes() : 0) + minutes);
        a.setBreakStartTime(null);
    }

    /**
     * Closes every visit/staff shift left open from an earlier day in the current
     * database. Called once per tenant by {@link AttendanceScheduler}.
     */
    @Transactional
    public int closeStaleSessions() {
        LocalDateTime cutoff = LocalDate.now().atStartOfDay(); // start of today = end of yesterday

        List<Attendance> openMember = attendanceRepository.findActiveSessionsBefore(cutoff);
        for (Attendance a : openMember) {
            close(a, LocalDateTime.now());
        }
        if (!openMember.isEmpty()) attendanceRepository.saveAll(openMember);

        // Staff shifts keep the end-of-day rule.
        List<StaffAttendance> openStaff = staffAttendanceRepository.findActiveSessionsBefore(cutoff);
        for (StaffAttendance sa : openStaff) {
            LocalDateTime eod = sa.getClockInTime().toLocalDate().atTime(LocalTime.of(23, 59));
            int minutes = (int) Duration.between(sa.getClockInTime(), eod).toMinutes();
            sa.setClockOutTime(eod);
            sa.setTotalMinutes(Math.max(minutes, 0));
            sa.setStatus("completed");
            sa.setNotes((sa.getNotes() != null ? sa.getNotes() + " | " : "") + "Auto-closed at midnight");
        }
        if (!openStaff.isEmpty()) staffAttendanceRepository.saveAll(openStaff);

        return openMember.size() + openStaff.size();
    }
}
