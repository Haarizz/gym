package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendance;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.services.conversations.ConversationPolicyService;
import com.company.project.services.pos.PosBusinessDayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Attendance › one day at a glance: every member, walk-in, trainer and staff visit of the day, who
 * is inside right now and for how long, the hour-by-hour flow, and the staff roster for the day.
 *
 * Times are stored on the server clock (UTC); the day is the gym's own calendar day (branch POS
 * time zone, else the browser's), so a UAE gym's "today" starts at its own midnight, not UTC's.
 * Every timestamp goes out as a UTC instant and the browser shows it in local time.
 */
@Service
public class AttendanceDayReportService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceDayReportService.class);

    /** A visit this long without checking out is flagged ("forgot to check out?"). */
    private static final int LONG_STAY_MINUTES = 180;

    private final AttendanceRepository attendanceRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final PosBusinessDayService businessDay;
    private final ShiftAttendanceService shiftAttendanceService;

    public AttendanceDayReportService(AttendanceRepository attendanceRepository,
                                      StaffAttendanceRepository staffAttendanceRepository,
                                      PosBusinessDayService businessDay,
                                      ShiftAttendanceService shiftAttendanceService) {
        this.attendanceRepository = attendanceRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.businessDay = businessDay;
        this.shiftAttendanceService = shiftAttendanceService;
    }

    // ------------------------------------------------------------------ wire types (snake_case globally)

    /** kind: member | walk_in | trainer | staff. */
    public record Visit(String key, String kind, Long recordId, Long personId, String code, String name, String photoUrl,
                        String detail, OffsetDateTime checkIn, OffsetDateTime checkOut, int minutes, boolean inside,
                        boolean fromEarlierDay, boolean longStay, String method, String activity, Integer workoutMinutes,
                        boolean workoutRunning, String paymentStatus) {}

    public record HourBucket(int hour, String label, int members, int walkIns, int staff, int trainers, int inside) {}

    public record DayCount(String date, String label, int visits) {}

    public record RosterRow(Long staffId, String code, String name, String role, boolean trainer, String photoUrl,
                            String shiftName, String scheduledIn, String scheduledOut, String actualIn, String actualOut,
                            int workedMinutes, int lateMinutes, String status, boolean inside) {}

    public record Summary(int visits, int memberVisits, int uniqueMembers, int walkIns, int checkedOut,
                          int avgStayMinutes, int longestStayMinutes, String longestStayName,
                          String peakHour, int peakHourVisits, int peakInside,
                          int insideMembers, int insideWalkIns, int insideTrainers, int insideStaff,
                          int trainersPresent, int staffPresent, int rosterScheduled, int rosterAbsent, int rosterLate,
                          int yesterdayVisits, int lastWeekVisits, int longStays) {}

    public record DayReport(String date, String timeZone, boolean today, OffsetDateTime generatedAt, Summary summary,
                            List<Visit> visits, List<HourBucket> hourly, List<DayCount> lastDays, List<RosterRow> roster) {}

    // ------------------------------------------------------------------ report

    @Transactional(readOnly = true)
    public DayReport report(String dateParam) {
        ZoneId zone = businessDay.zone();
        LocalDate today = LocalDate.now(zone);
        LocalDate date = StringUtils.hasText(dateParam) ? LocalDate.parse(dateParam.trim()) : today;
        boolean isToday = date.equals(today);
        LocalDateTime nowServer = LocalDateTime.now(); // server clock = UTC
        LocalDateTime start = toServer(date.atStartOfDay(), zone);
        LocalDateTime end = toServer(date.plusDays(1).atStartOfDay(), zone);
        // For a past day "now" is the end of that day: open sessions are counted up to midnight.
        LocalDateTime until = isToday ? nowServer : (end.isBefore(nowServer) ? end : nowServer);

        List<Visit> visits = new ArrayList<>();
        Set<Long> seenAttendance = new HashSet<>();
        Set<Long> seenStaff = new HashSet<>();

        for (Attendance a : attendanceRepository.findByDateRange(start, end)) {
            seenAttendance.add(a.getId());
            visits.add(memberVisit(a, until, isToday, false));
        }
        for (StaffAttendance sa : staffAttendanceRepository.findByDateRange(start, end)) {
            seenStaff.add(sa.getId());
            visits.add(staffVisit(sa, until, isToday, false));
        }
        if (isToday) {
            // People who arrived before midnight and are still inside belong on today's "inside now".
            for (Attendance a : attendanceRepository.findOpenSessions()) {
                if (seenAttendance.add(a.getId())) visits.add(memberVisit(a, until, true, true));
            }
            for (StaffAttendance sa : staffAttendanceRepository.findOpenSessions()) {
                if (seenStaff.add(sa.getId())) visits.add(staffVisit(sa, until, true, true));
            }
        }
        visits.sort(Comparator.comparing(Visit::checkIn, Comparator.nullsLast(Comparator.reverseOrder())));

        List<HourBucket> hourly = hourly(visits, date, zone, until);
        List<RosterRow> roster = roster(date, visits);
        List<DayCount> lastDays = lastDays(date, zone);

        return new DayReport(date.toString(), zone.getId(), isToday, nowServer.atOffset(ZoneOffset.UTC),
                summary(visits, hourly, roster, lastDays, date), visits, hourly, lastDays, roster);
    }

    // ------------------------------------------------------------------ rows

    private Visit memberVisit(Attendance a, LocalDateTime until, boolean liveDay, boolean earlier) {
        boolean walkIn = "walk_in".equals(a.getType());
        boolean inside = a.getCheckOutTime() == null && "active".equals(a.getStatus());
        int minutes = a.getTotalMinutes() != null && !inside ? a.getTotalMinutes() : minutesBetween(a.getCheckInTime(),
                a.getCheckOutTime() != null ? a.getCheckOutTime() : until);
        boolean workoutRunning = a.getWorkoutStartTime() != null && a.getWorkoutEndTime() == null && inside;
        var m = a.getMember();
        String name = walkIn ? (StringUtils.hasText(a.getWalkInName()) ? a.getWalkInName() : "Walk-in visitor")
                : (m != null ? m.getName() : "Member");
        String detail = walkIn ? (StringUtils.hasText(a.getWalkInPhone()) ? a.getWalkInPhone() : "Day pass")
                : (m != null ? m.getMembershipType() : null);
        return new Visit("a" + a.getId(), walkIn ? "walk_in" : "member", a.getId(), m != null ? m.getId() : null,
                m != null ? m.getMemberId() : null, name, m != null ? m.getPhotoUrl() : null, detail,
                utc(a.getCheckInTime()), utc(a.getCheckOutTime()), minutes, inside && liveDay, earlier,
                inside && liveDay && minutes >= LONG_STAY_MINUTES, a.getCheckInMethod(), a.getActivityType(),
                a.getWorkoutMinutes(), workoutRunning, walkIn ? a.getWalkInPaymentStatus() : null);
    }

    private Visit staffVisit(StaffAttendance sa, LocalDateTime until, boolean liveDay, boolean earlier) {
        Staff s = sa.getStaff();
        boolean inside = sa.getClockOutTime() == null && "working".equals(sa.getStatus());
        int minutes = sa.getTotalMinutes() != null && !inside ? sa.getTotalMinutes() : minutesBetween(sa.getClockInTime(),
                sa.getClockOutTime() != null ? sa.getClockOutTime() : until);
        boolean trainer = s != null && ConversationPolicyService.isTrainer(s);
        return new Visit("s" + sa.getId(), trainer ? "trainer" : "staff", sa.getId(), s != null ? s.getId() : null,
                s != null ? s.getStaffId() : null, s != null ? s.getName() : "Staff", s != null ? s.getPhotoUrl() : null,
                s != null ? s.getRole() : null, utc(sa.getClockInTime()), utc(sa.getClockOutTime()), minutes,
                inside && liveDay, earlier, false, sa.getDeviceId(), null, null, false, null);
    }

    // ------------------------------------------------------------------ hourly flow

    private List<HourBucket> hourly(List<Visit> visits, LocalDate date, ZoneId zone, LocalDateTime until) {
        int[] members = new int[24], walkIns = new int[24], staff = new int[24], trainers = new int[24], inside = new int[24];
        OffsetDateTime untilUtc = until.atOffset(ZoneOffset.UTC);
        for (Visit v : visits) {
            if (v.checkIn() == null) continue;
            var localIn = v.checkIn().atZoneSameInstant(zone);
            if (localIn.toLocalDate().equals(date)) {
                int h = localIn.getHour();
                switch (v.kind()) {
                    case "walk_in" -> walkIns[h]++;
                    case "trainer" -> trainers[h]++;
                    case "staff" -> staff[h]++;
                    default -> members[h]++;
                }
            }
            if ("member".equals(v.kind()) || "walk_in".equals(v.kind())) {
                // Members present at any point during each hour (occupancy).
                OffsetDateTime out = v.checkOut() != null ? v.checkOut() : untilUtc;
                for (int h = 0; h < 24; h++) {
                    OffsetDateTime hs = date.atTime(h, 0).atZone(zone).toOffsetDateTime();
                    OffsetDateTime he = hs.plusHours(1);
                    if (v.checkIn().isBefore(he) && out.isAfter(hs)) inside[h]++;
                }
            }
        }
        List<HourBucket> out = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            out.add(new HourBucket(h, hourLabel(h), members[h], walkIns[h], staff[h], trainers[h], inside[h]));
        }
        return out;
    }

    // ------------------------------------------------------------------ last 14 days

    private List<DayCount> lastDays(LocalDate date, ZoneId zone) {
        LocalDate first = date.minusDays(13);
        LocalDateTime from = toServer(first.atStartOfDay(), zone);
        LocalDateTime to = toServer(date.plusDays(1).atStartOfDay(), zone);
        Map<LocalDate, Integer> counts = new HashMap<>();
        for (LocalDateTime t : attendanceRepository.findCheckInTimesBetween(from, to)) {
            LocalDate d = t.atOffset(ZoneOffset.UTC).atZoneSameInstant(zone).toLocalDate();
            counts.merge(d, 1, Integer::sum);
        }
        List<DayCount> out = new ArrayList<>();
        for (LocalDate d = first; !d.isAfter(date); d = d.plusDays(1)) {
            out.add(new DayCount(d.toString(), d.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH)
                    + " " + d.getDayOfMonth(), counts.getOrDefault(d, 0)));
        }
        return out;
    }

    // ------------------------------------------------------------------ staff roster

    private List<RosterRow> roster(LocalDate date, List<Visit> visits) {
        Set<Long> insideStaff = new HashSet<>();
        for (Visit v : visits) {
            if (v.inside() && ("staff".equals(v.kind()) || "trainer".equals(v.kind())) && v.personId() != null) {
                insideStaff.add(v.personId());
            }
        }
        List<RosterRow> rows = new ArrayList<>();
        try {
            Map<Long, Boolean> trainerById = new HashMap<>();
            for (Staff s : shiftAttendanceService.workforce()) trainerById.put(s.getId(), ConversationPolicyService.isTrainer(s));
            for (Map<String, Object> r : shiftAttendanceService.dailyRecords(date, date, null)) {
                Long id = r.get("staff_id") instanceof Number n ? n.longValue() : null;
                rows.add(new RosterRow(id, str(r.get("staff_code")), str(r.get("staff_name")), str(r.get("role")),
                        Boolean.TRUE.equals(trainerById.get(id)), str(r.get("photo_url")), str(r.get("shift_name")),
                        str(r.get("scheduled_in")), str(r.get("scheduled_out")), str(r.get("actual_in")),
                        str(r.get("actual_out")), num(r.get("worked_minutes")), num(r.get("late_minutes")),
                        str(r.get("status")), id != null && insideStaff.contains(id)));
            }
        } catch (Exception e) {
            // A gym database without the workforce tables yet: the day's punches still show in the visit list.
            log.debug("Staff roster unavailable for {}: {}", date, e.getMessage());
        }
        return rows;
    }

    // ------------------------------------------------------------------ summary

    private Summary summary(List<Visit> visits, List<HourBucket> hourly, List<RosterRow> roster,
                            List<DayCount> lastDays, LocalDate date) {
        int memberVisits = 0, walkIns = 0, checkedOut = 0, insideMembers = 0, insideWalkIns = 0, insideTrainers = 0,
                insideStaff = 0, longStays = 0, stayTotal = 0, stayCount = 0, longest = 0;
        String longestName = null;
        Set<Long> uniqueMembers = new HashSet<>();
        Set<Long> trainersPresent = new HashSet<>();
        Set<Long> staffPresent = new HashSet<>();
        for (Visit v : visits) {
            boolean guest = "member".equals(v.kind()) || "walk_in".equals(v.kind());
            if (guest && v.fromEarlierDay()) {
                // counted as inside now, not as one of today's visits
                if (v.inside()) { if ("walk_in".equals(v.kind())) insideWalkIns++; else insideMembers++; }
                if (v.longStay()) longStays++;
                continue;
            }
            switch (v.kind()) {
                case "member" -> {
                    memberVisits++;
                    if (v.personId() != null) uniqueMembers.add(v.personId());
                    if (v.inside()) insideMembers++;
                }
                case "walk_in" -> {
                    walkIns++;
                    if (v.inside()) insideWalkIns++;
                }
                case "trainer" -> {
                    if (v.personId() != null) trainersPresent.add(v.personId());
                    if (v.inside()) insideTrainers++;
                }
                default -> {
                    if (v.personId() != null) staffPresent.add(v.personId());
                    if (v.inside()) insideStaff++;
                }
            }
            if (guest) {
                if (v.checkOut() != null) {
                    checkedOut++;
                    stayTotal += v.minutes();
                    stayCount++;
                }
                if (v.minutes() > longest) { longest = v.minutes(); longestName = v.name(); }
                if (v.longStay()) longStays++;
            }
        }
        HourBucket peak = null, peakIn = null;
        for (HourBucket h : hourly) {
            int n = h.members() + h.walkIns();
            if (n > 0 && (peak == null || n > peak.members() + peak.walkIns())) peak = h;
            if (h.inside() > 0 && (peakIn == null || h.inside() > peakIn.inside())) peakIn = h;
        }
        int scheduled = 0, absent = 0, late = 0;
        for (RosterRow r : roster) {
            String s = r.status() == null ? "" : r.status();
            if (!s.equals("Weekly Off") && !s.equals("No Shift") && !s.equals("Holiday") && !s.endsWith("Leave")) scheduled++;
            if (s.equals("Absent")) absent++;
            if (r.lateMinutes() > 0) late++;
        }
        int yesterday = 0, lastWeek = 0;
        for (DayCount d : lastDays) {
            if (d.date().equals(date.minusDays(1).toString())) yesterday = d.visits();
            if (d.date().equals(date.minusDays(7).toString())) lastWeek = d.visits();
        }
        return new Summary(memberVisits + walkIns, memberVisits, uniqueMembers.size(), walkIns, checkedOut,
                stayCount == 0 ? 0 : Math.round((float) stayTotal / stayCount), longest, longestName,
                peak == null ? null : hourRange(peak.hour()), peak == null ? 0 : peak.members() + peak.walkIns(),
                peakIn == null ? 0 : peakIn.inside(),
                insideMembers, insideWalkIns, insideTrainers, insideStaff,
                trainersPresent.size(), staffPresent.size(), scheduled, absent, late, yesterday, lastWeek, longStays);
    }

    // ------------------------------------------------------------------ helpers

    private static LocalDateTime toServer(LocalDateTime gymLocal, ZoneId zone) {
        return gymLocal.atZone(zone).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    private static OffsetDateTime utc(LocalDateTime server) {
        return server == null ? null : server.atZone(ZoneId.systemDefault()).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static int minutesBetween(LocalDateTime a, LocalDateTime b) {
        if (a == null || b == null || b.isBefore(a)) return 0;
        return (int) Duration.between(a, b).toMinutes();
    }

    private static String hourLabel(int h) {
        int x = h % 12 == 0 ? 12 : h % 12;
        return x + (h < 12 ? " AM" : " PM");
    }

    private static String hourRange(int h) {
        return hourLabel(h) + " – " + hourLabel((h + 1) % 24);
    }

    private static String str(Object o) {
        return o == null ? null : Objects.toString(o);
    }

    private static int num(Object o) {
        return o instanceof Number n ? n.intValue() : 0;
    }
}
