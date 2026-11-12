package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendance;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
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
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Attendance › Reports: a date range seen from every side — daily trend against the previous
 * period, a weekday × hour heatmap, how long people stay and how they check in, every member's
 * visit frequency, active members who have not come in, and staff/trainer presence (with lateness
 * and absences from the shift roster). Days are the gym's own calendar days (branch POS time
 * zone, else the browser's), like the day report.
 */
@Service
public class AttendanceRangeReportService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceRangeReportService.class);
    private static final int MAX_DAYS = 366;
    /** The roster (lateness/absence) is computed day by day per employee — kept to about a quarter. */
    private static final int MAX_ROSTER_DAYS = 93;
    private static final List<String> WEEKDAYS = List.of("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");

    private final AttendanceRepository attendanceRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final MemberRepository memberRepository;
    private final PosBusinessDayService businessDay;
    private final ShiftAttendanceService shiftAttendanceService;

    public AttendanceRangeReportService(AttendanceRepository attendanceRepository,
                                        StaffAttendanceRepository staffAttendanceRepository,
                                        MemberRepository memberRepository,
                                        PosBusinessDayService businessDay,
                                        ShiftAttendanceService shiftAttendanceService) {
        this.attendanceRepository = attendanceRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.memberRepository = memberRepository;
        this.businessDay = businessDay;
        this.shiftAttendanceService = shiftAttendanceService;
    }

    // ------------------------------------------------------------------ wire types (snake_case globally)

    public record Totals(int visits, int memberVisits, int walkIns, int uniqueMembers, double avgPerDay,
                         int avgStayMinutes, long totalMinutes, int noCheckout, double visitsPerMember) {}

    public record Summary(String from, String to, int days, int elapsedDays, String compareFrom, String compareTo,
                          Totals current, Totals previous, long activeMembers, double reachPct, int newVisitors,
                          String peakHour, int peakHourVisits, String busiestDate, int busiestDateVisits,
                          String busiestWeekday, String quietestWeekday, int notVisitedCount) {}

    public record DayRow(String date, String label, String weekday, int visits, int members, int walkIns,
                         int uniqueMembers, int avgStayMinutes, Integer previousVisits, boolean future) {}

    public record WeekdayRow(String day, int visits, int occurrences, double average) {}

    public record Slice(String label, int count, double pct) {}

    public record MemberRow(Long id, String code, String name, String photoUrl, String plan, int visits, int daysVisited,
                            int avgStayMinutes, long totalMinutes, double perWeek, OffsetDateTime firstVisit,
                            OffsetDateTime lastVisit, String usualTime, boolean newVisitor) {}

    public record AbsentRow(Long id, String code, String name, String phone, String photoUrl, String plan,
                            OffsetDateTime lastVisit, Integer daysSinceLastVisit, String membershipEnds) {}

    public record StaffRow(Long id, String code, String name, String role, boolean trainer, String photoUrl,
                           int sessions, int daysPresent, long totalMinutes, int avgMinutesPerDay,
                           String usualIn, Integer scheduledDays, Integer lateDays, Integer lateMinutes,
                           Integer absentDays, Integer overtimeMinutes, Double punctualityPct, boolean openNow) {}

    public record Insight(String tone, String title, String text) {}

    public record RangeReport(String timeZone, OffsetDateTime generatedAt, Summary summary, List<DayRow> daily,
                              List<WeekdayRow> weekdays, int[][] heatmap, int[] hourly, List<Slice> stay,
                              List<Slice> methods, List<Slice> activities, List<Slice> plans, List<Slice> frequency,
                              List<MemberRow> members, List<AbsentRow> notVisited, List<StaffRow> staff,
                              boolean rosterIncluded, List<Insight> insights) {}

    // ------------------------------------------------------------------ report

    /** One visit, already in gym time. */
    private record V(Attendance a, LocalDateTime in, LocalDate day, Integer minutes) {}

    @Transactional(readOnly = true)
    public RangeReport report(String fromParam, String toParam) {
        ZoneId zone = businessDay.zone();
        LocalDate today = LocalDate.now(zone);
        LocalDate to = StringUtils.hasText(toParam) ? LocalDate.parse(toParam.trim()) : today;
        LocalDate from = StringUtils.hasText(fromParam) ? LocalDate.parse(fromParam.trim()) : to.minusDays(29);
        if (from.isAfter(to)) { LocalDate t = from; from = to; to = t; }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) from = to.minusDays(MAX_DAYS - 1);
        int days = (int) ChronoUnit.DAYS.between(from, to) + 1;
        LocalDate prevTo = from.minusDays(1);
        LocalDate prevFrom = prevTo.minusDays(days - 1);
        LocalDate lastCounted = to.isAfter(today) ? today : to;
        int elapsed = lastCounted.isBefore(from) ? 0 : (int) ChronoUnit.DAYS.between(from, lastCounted) + 1;

        List<V> cur = load(from, to, zone);
        List<V> prev = load(prevFrom, prevTo, zone);
        LocalDateTime nowServer = LocalDateTime.now();

        // ── Daily ─────────────────────────────────────────────────────────
        Map<LocalDate, List<V>> byDay = new HashMap<>();
        for (V v : cur) byDay.computeIfAbsent(v.day(), k -> new ArrayList<>()).add(v);
        Map<LocalDate, Integer> prevByDay = new HashMap<>();
        for (V v : prev) prevByDay.merge(v.day(), 1, Integer::sum);
        List<DayRow> daily = new ArrayList<>();
        int i = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1), i++) {
            List<V> list = byDay.getOrDefault(d, List.of());
            int members = 0, walkIns = 0;
            Set<Long> uniq = new HashSet<>();
            for (V v : list) {
                if (isWalkIn(v.a())) walkIns++; else { members++; if (v.a().getMember() != null) uniq.add(v.a().getMember().getId()); }
            }
            daily.add(new DayRow(d.toString(), d.getDayOfMonth() + " " + d.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    WEEKDAYS.get(d.getDayOfWeek().getValue() - 1), list.size(), members, walkIns, uniq.size(), avgStay(list),
                    d.isAfter(today) ? null : prevByDay.getOrDefault(prevFrom.plusDays(i), 0), d.isAfter(today)));
        }

        // ── Weekday, heatmap, hourly ─────────────────────────────────────
        int[][] heat = new int[7][24];
        int[] hourly = new int[24];
        int[] wdVisits = new int[7];
        int[] wdCount = new int[7];
        for (LocalDate d = from; !d.isAfter(lastCounted); d = d.plusDays(1)) wdCount[d.getDayOfWeek().getValue() - 1]++;
        for (V v : cur) {
            int wd = v.in().getDayOfWeek().getValue() - 1;
            heat[wd][v.in().getHour()]++;
            hourly[v.in().getHour()]++;
            wdVisits[wd]++;
        }
        List<WeekdayRow> weekdays = new ArrayList<>();
        for (int w = 0; w < 7; w++) {
            weekdays.add(new WeekdayRow(WEEKDAYS.get(w), wdVisits[w], wdCount[w], wdCount[w] == 0 ? 0 : round1((double) wdVisits[w] / wdCount[w])));
        }

        // ── Distributions ────────────────────────────────────────────────
        String[] stayLabels = {"Under 30m", "30–60m", "1–1.5h", "1.5–2h", "2–3h", "Over 3h", "No check-out"};
        int[] stay = new int[stayLabels.length];
        Map<String, Integer> methods = new LinkedHashMap<>(), activities = new LinkedHashMap<>(), plans = new LinkedHashMap<>();
        for (V v : cur) {
            Integer m = v.minutes();
            if (m == null) stay[6]++;
            else if (m < 30) stay[0]++;
            else if (m < 60) stay[1]++;
            else if (m < 90) stay[2]++;
            else if (m < 120) stay[3]++;
            else if (m < 180) stay[4]++;
            else stay[5]++;
            methods.merge(methodLabel(v.a().getCheckInMethod()), 1, Integer::sum);
            if (StringUtils.hasText(v.a().getActivityType())) activities.merge(v.a().getActivityType().trim(), 1, Integer::sum);
            String plan = isWalkIn(v.a()) ? "Walk-in / day pass"
                    : v.a().getMember() != null && StringUtils.hasText(v.a().getMember().getMembershipType())
                    ? v.a().getMember().getMembershipType().trim() : "No plan";
            plans.merge(plan, 1, Integer::sum);
        }
        List<Slice> staySlices = new ArrayList<>();
        for (int s = 0; s < stayLabels.length; s++) staySlices.add(new Slice(stayLabels[s], stay[s], pct(stay[s], cur.size())));

        // ── Members ──────────────────────────────────────────────────────
        Map<Long, LocalDateTime[]> firstLast = new HashMap<>();
        try {
            for (Object[] r : attendanceRepository.findFirstAndLastVisitPerMember()) {
                firstLast.put(((Number) r[0]).longValue(), new LocalDateTime[]{(LocalDateTime) r[1], (LocalDateTime) r[2]});
            }
        } catch (Exception e) {
            log.debug("first/last visit lookup failed: {}", e.getMessage());
        }
        LocalDateTime rangeStartServer = toServer(from.atStartOfDay(), zone);
        LocalDateTime rangeEndServer = toServer(to.plusDays(1).atStartOfDay(), zone);
        Map<Long, List<V>> byMember = new LinkedHashMap<>();
        for (V v : cur) if (!isWalkIn(v.a()) && v.a().getMember() != null) byMember.computeIfAbsent(v.a().getMember().getId(), k -> new ArrayList<>()).add(v);
        double weeks = Math.max(1.0, elapsed) / 7.0;
        List<MemberRow> members = new ArrayList<>();
        int newVisitors = 0;
        int[] freq = new int[5];
        for (Map.Entry<Long, List<V>> e : byMember.entrySet()) {
            List<V> list = e.getValue();
            var m = list.get(0).a().getMember();
            Set<LocalDate> dayset = new HashSet<>();
            long total = 0;
            int[] hours = new int[24];
            LocalDateTime first = null, last = null;
            for (V v : list) {
                dayset.add(v.day());
                if (v.minutes() != null) total += v.minutes();
                hours[v.in().getHour()]++;
                LocalDateTime raw = v.a().getCheckInTime();
                if (first == null || raw.isBefore(first)) first = raw;
                if (last == null || raw.isAfter(last)) last = raw;
            }
            LocalDateTime[] fl = firstLast.get(e.getKey());
            boolean isNew = fl != null && fl[0] != null && !fl[0].isBefore(rangeStartServer) && fl[0].isBefore(rangeEndServer);
            if (isNew) newVisitors++;
            int n = list.size();
            freq[n == 1 ? 0 : n <= 3 ? 1 : n <= 7 ? 2 : n <= 11 ? 3 : 4]++;
            int usual = 0;
            for (int h = 1; h < 24; h++) if (hours[h] > hours[usual]) usual = h;
            members.add(new MemberRow(e.getKey(), m.getMemberId(), m.getName(), m.getPhotoUrl(), m.getMembershipType(), n,
                    dayset.size(), avgStay(list), total, round1(n / weeks), utc(first), utc(fl != null && fl[1] != null ? fl[1] : last),
                    hourLabel(usual), isNew));
        }
        members.sort(Comparator.comparingInt(MemberRow::visits).reversed().thenComparing(MemberRow::name, Comparator.nullsLast(String::compareToIgnoreCase)));
        String[] freqLabels = {"1 visit", "2–3 visits", "4–7 visits", "8–11 visits", "12+ visits"};
        List<Slice> frequency = new ArrayList<>();
        for (int f = 0; f < 5; f++) frequency.add(new Slice(freqLabels[f], freq[f], pct(freq[f], byMember.size())));

        // ── Active members who did not come in ───────────────────────────
        long activeMembers = 0;
        List<AbsentRow> notVisited = new ArrayList<>();
        int notVisitedCount = 0;
        try {
            List<Object[]> active = memberRepository.findEffectivelyActiveBrief(LocalDate.now().atStartOfDay());
            activeMembers = active.size();
            for (Object[] r : active) {
                Long id = ((Number) r[0]).longValue();
                if (byMember.containsKey(id)) continue;
                notVisitedCount++;
                LocalDateTime[] fl = firstLast.get(id);
                LocalDateTime lastVisit = fl != null ? fl[1] : null;
                Integer since = lastVisit == null ? null
                        : (int) ChronoUnit.DAYS.between(lastVisit.atZone(ZoneId.systemDefault()).withZoneSameInstant(zone).toLocalDate(), today);
                LocalDateTime end = (LocalDateTime) r[6];
                notVisited.add(new AbsentRow(id, (String) r[1], (String) r[2], (String) r[3], (String) r[4], (String) r[5],
                        utc(lastVisit), since, end == null ? null : end.toLocalDate().toString()));
            }
        } catch (Exception e) {
            log.debug("active member lookup failed: {}", e.getMessage());
        }
        // Longest-absent first (never visited at the very top).
        notVisited.sort(Comparator.comparing(AbsentRow::daysSinceLastVisit, Comparator.nullsFirst(Comparator.reverseOrder())));
        if (notVisited.size() > 500) notVisited = new ArrayList<>(notVisited.subList(0, 500));

        // ── Staff & trainers ─────────────────────────────────────────────
        boolean rosterIncluded = days <= MAX_ROSTER_DAYS;
        List<StaffRow> staff = staff(from, to, zone, rosterIncluded, nowServer);

        // ── Summary ──────────────────────────────────────────────────────
        Totals curT = totals(cur, elapsed);
        Totals prevT = totals(prev, days);
        int peakH = -1;
        for (int h = 0; h < 24; h++) if (hourly[h] > 0 && (peakH < 0 || hourly[h] > hourly[peakH])) peakH = h;
        DayRow busiest = daily.stream().filter(d -> d.visits() > 0).max(Comparator.comparingInt(DayRow::visits)).orElse(null);
        WeekdayRow bw = weekdays.stream().filter(w -> w.occurrences() > 0).max(Comparator.comparingDouble(WeekdayRow::average)).orElse(null);
        WeekdayRow qw = weekdays.stream().filter(w -> w.occurrences() > 0).min(Comparator.comparingDouble(WeekdayRow::average)).orElse(null);
        Summary summary = new Summary(from.toString(), to.toString(), days, elapsed, prevFrom.toString(), prevTo.toString(),
                curT, prevT, activeMembers, activeMembers == 0 ? 0 : round1(curT.uniqueMembers() * 100.0 / activeMembers),
                newVisitors, peakH < 0 ? null : hourRange(peakH), peakH < 0 ? 0 : hourly[peakH],
                busiest == null ? null : busiest.date(), busiest == null ? 0 : busiest.visits(),
                bw == null || bw.visits() == 0 ? null : bw.day(), qw == null || bw == null || bw.visits() == 0 ? null : qw.day(), notVisitedCount);

        return new RangeReport(zone.getId(), nowServer.atOffset(ZoneOffset.UTC), summary, daily, weekdays, heat, hourly,
                staySlices, slices(methods, cur.size()), slices(activities, cur.size()), slices(plans, cur.size()), frequency,
                members, notVisited, staff, rosterIncluded, insights(summary, weekdays, staySlices, staff));
    }

    // ------------------------------------------------------------------ pieces

    private List<V> load(LocalDate from, LocalDate to, ZoneId zone) {
        List<V> out = new ArrayList<>();
        for (Attendance a : attendanceRepository.findByDateRange(toServer(from.atStartOfDay(), zone), toServer(to.plusDays(1).atStartOfDay(), zone))) {
            if (a.getCheckInTime() == null) continue;
            LocalDateTime in = a.getCheckInTime().atZone(ZoneId.systemDefault()).withZoneSameInstant(zone).toLocalDateTime();
            Integer minutes = a.getTotalMinutes();
            if (minutes == null && a.getCheckOutTime() != null) {
                minutes = (int) Math.max(0, Duration.between(a.getCheckInTime(), a.getCheckOutTime()).toMinutes());
            }
            out.add(new V(a, in, in.toLocalDate(), a.getCheckOutTime() == null ? null : minutes));
        }
        return out;
    }

    private static Totals totals(List<V> list, int days) {
        int walkIns = 0, noCheckout = 0;
        long total = 0;
        Set<Long> uniq = new HashSet<>();
        for (V v : list) {
            if (isWalkIn(v.a())) walkIns++;
            else if (v.a().getMember() != null) uniq.add(v.a().getMember().getId());
            if (v.minutes() == null) noCheckout++; else total += v.minutes();
        }
        int memberVisits = list.size() - walkIns;
        return new Totals(list.size(), memberVisits, walkIns, uniq.size(), days == 0 ? 0 : round1((double) list.size() / days),
                avgStay(list), total, noCheckout, uniq.isEmpty() ? 0 : round1((double) memberVisits / uniq.size()));
    }

    private List<StaffRow> staff(LocalDate from, LocalDate to, ZoneId zone, boolean withRoster, LocalDateTime nowServer) {
        Map<Long, Staff> people = new LinkedHashMap<>();
        Map<Long, List<StaffAttendance>> punches = new HashMap<>();
        for (StaffAttendance sa : staffAttendanceRepository.findByDateRange(toServer(from.atStartOfDay(), zone), toServer(to.plusDays(1).atStartOfDay(), zone))) {
            if (sa.getStaff() == null) continue;
            people.putIfAbsent(sa.getStaff().getId(), sa.getStaff());
            punches.computeIfAbsent(sa.getStaff().getId(), k -> new ArrayList<>()).add(sa);
        }
        Map<Long, int[]> roster = new HashMap<>(); // scheduled, late days, late minutes, absent, ot
        if (withRoster) {
            try {
                for (Staff s : shiftAttendanceService.workforce()) people.putIfAbsent(s.getId(), s);
                for (Map<String, Object> r : shiftAttendanceService.dailyRecords(from, to, null)) {
                    Long id = r.get("staff_id") instanceof Number n ? n.longValue() : null;
                    if (id == null) continue;
                    int[] t = roster.computeIfAbsent(id, k -> new int[5]);
                    String status = String.valueOf(r.get("status"));
                    if (Boolean.TRUE.equals(r.get("scheduled"))) t[0]++;
                    int late = r.get("late_minutes") instanceof Number n ? n.intValue() : 0;
                    if (late > 0) { t[1]++; t[2] += late; }
                    if ("Absent".equals(status)) t[3]++;
                    t[4] += r.get("ot_minutes") instanceof Number n ? n.intValue() : 0;
                }
            } catch (Exception e) {
                log.debug("roster unavailable: {}", e.getMessage());
                roster.clear();
            }
        }
        List<StaffRow> out = new ArrayList<>();
        for (Staff s : people.values()) {
            List<StaffAttendance> list = punches.getOrDefault(s.getId(), List.of());
            Set<LocalDate> dayset = new HashSet<>();
            long total = 0;
            boolean open = false;
            List<Integer> inMinutes = new ArrayList<>();
            Map<LocalDate, Integer> firstIn = new HashMap<>();
            for (StaffAttendance sa : list) {
                LocalDateTime in = sa.getClockInTime().atZone(ZoneId.systemDefault()).withZoneSameInstant(zone).toLocalDateTime();
                dayset.add(in.toLocalDate());
                int mins = in.getHour() * 60 + in.getMinute();
                firstIn.merge(in.toLocalDate(), mins, Math::min);
                if (sa.getClockOutTime() != null) {
                    total += sa.getTotalMinutes() != null ? sa.getTotalMinutes() : Math.max(0, Duration.between(sa.getClockInTime(), sa.getClockOutTime()).toMinutes());
                } else if ("working".equals(sa.getStatus())) {
                    open = true;
                    total += Math.max(0, Duration.between(sa.getClockInTime(), nowServer).toMinutes());
                }
            }
            inMinutes.addAll(firstIn.values());
            String usualIn = null;
            if (!inMinutes.isEmpty()) {
                int avg = (int) Math.round(inMinutes.stream().mapToInt(Integer::intValue).average().orElse(0));
                usualIn = clock(avg / 60, avg % 60);
            }
            int[] t = roster.get(s.getId());
            Integer scheduled = t == null ? null : t[0];
            Double punctuality = null;
            if (t != null) {
                int attended = Math.max(0, t[0] - t[3]);
                punctuality = attended == 0 ? null : round1((attended - t[1]) * 100.0 / attended);
            }
            if (list.isEmpty() && (t == null || t[0] == 0)) continue; // never scheduled, never came: nothing to report
            out.add(new StaffRow(s.getId(), s.getStaffId(), s.getName(), s.getRole(), ConversationPolicyService.isTrainer(s), s.getPhotoUrl(),
                    list.size(), dayset.size(), total, dayset.isEmpty() ? 0 : (int) (total / dayset.size()), usualIn,
                    scheduled, t == null ? null : t[1], t == null ? null : t[2], t == null ? null : t[3], t == null ? null : t[4],
                    punctuality, open));
        }
        out.sort(Comparator.comparing(StaffRow::trainer).reversed().thenComparing(Comparator.comparingLong(StaffRow::totalMinutes).reversed()));
        return out;
    }

    private static List<Insight> insights(Summary s, List<WeekdayRow> weekdays, List<Slice> stay, List<StaffRow> staff) {
        List<Insight> out = new ArrayList<>();
        Totals c = s.current(), p = s.previous();
        if (c.visits() == 0) {
            out.add(new Insight("info", "No visits in this period", "Nobody checked in between these dates."));
            return out;
        }
        if (p.visits() > 0) {
            double change = (c.visits() - p.visits()) * 100.0 / p.visits();
            if (Math.abs(change) >= 5) {
                out.add(new Insight(change > 0 ? "good" : "warning",
                        "Visits " + (change > 0 ? "up " : "down ") + Math.round(Math.abs(change)) + "%",
                        c.visits() + " visits against " + p.visits() + " in the previous " + s.days() + " days."));
            }
        }
        if (s.busiestWeekday() != null && s.quietestWeekday() != null && !s.busiestWeekday().equals(s.quietestWeekday())) {
            WeekdayRow b = weekdays.stream().filter(w -> w.day().equals(s.busiestWeekday())).findFirst().orElse(null);
            WeekdayRow q = weekdays.stream().filter(w -> w.day().equals(s.quietestWeekday())).findFirst().orElse(null);
            if (b != null && q != null) {
                out.add(new Insight("info", "Busiest on " + full(b.day()), "About " + Math.round(b.average()) + " visits on an average "
                        + full(b.day()) + ", against " + Math.round(q.average()) + " on " + full(q.day()) + " — a good day for promotions or classes."));
            }
        }
        if (s.peakHour() != null) {
            out.add(new Insight("info", "Peak time " + s.peakHour(), s.peakHourVisits() + " check-ins started in this hour. Plan floor staff and trainers around it."));
        }
        if (s.notVisitedCount() > 0 && s.activeMembers() > 0) {
            out.add(new Insight(s.notVisitedCount() * 100.0 / s.activeMembers() >= 40 ? "warning" : "info",
                    s.notVisitedCount() + " active members didn't come in",
                    "They have a valid membership but no visit in this period — a friendly follow-up keeps them from lapsing."));
        }
        if (s.newVisitors() > 0) {
            out.add(new Insight("good", s.newVisitors() + " first-time visitors", "Members who checked in for the first time ever in this period."));
        }
        Slice none = stay.get(stay.size() - 1);
        if (none.pct() >= 10) {
            out.add(new Insight("warning", Math.round(none.pct()) + "% of visits never checked out",
                    "Time inside can't be measured for them. Remind members to check out, or let the face device check them out."));
        }
        int late = staff.stream().mapToInt(r -> r.lateDays() == null ? 0 : r.lateDays()).sum();
        int absent = staff.stream().mapToInt(r -> r.absentDays() == null ? 0 : r.absentDays()).sum();
        if (late + absent > 0) {
            out.add(new Insight(absent > 0 ? "warning" : "info", "Team: " + late + " late arrival" + (late == 1 ? "" : "s")
                    + ", " + absent + " absence" + (absent == 1 ? "" : "s"), "From the shift roster for this period."));
        }
        if (p.avgStayMinutes() > 0 && c.avgStayMinutes() > 0 && Math.abs(c.avgStayMinutes() - p.avgStayMinutes()) >= 10) {
            out.add(new Insight("info", "Average stay " + (c.avgStayMinutes() > p.avgStayMinutes() ? "longer" : "shorter"),
                    c.avgStayMinutes() + " minutes per visit, against " + p.avgStayMinutes() + " before."));
        }
        return out;
    }

    // ------------------------------------------------------------------ helpers

    private static boolean isWalkIn(Attendance a) { return "walk_in".equals(a.getType()); }

    private static int avgStay(List<V> list) {
        long sum = 0; int n = 0;
        for (V v : list) if (v.minutes() != null) { sum += v.minutes(); n++; }
        return n == 0 ? 0 : (int) Math.round((double) sum / n);
    }

    private static List<Slice> slices(Map<String, Integer> counts, int total) {
        List<Slice> out = new ArrayList<>();
        counts.entrySet().stream().sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .forEach(e -> out.add(new Slice(e.getKey(), e.getValue(), pct(e.getValue(), total))));
        return out;
    }

    private static String methodLabel(String m) {
        if (!StringUtils.hasText(m)) return "Other";
        return switch (m.trim().toLowerCase(Locale.ROOT)) {
            case "face", "face_recognition" -> "Face device";
            case "qr", "qr_code", "qrcode" -> "QR code";
            case "manual", "web", "desk", "reception" -> "Front desk";
            case "mobile", "app" -> "Member app";
            case "barcode" -> "Barcode";
            case "card", "rfid", "nfc" -> "Card";
            case "kiosk" -> "Kiosk";
            default -> Character.toUpperCase(m.trim().charAt(0)) + m.trim().substring(1).replace('_', ' ');
        };
    }

    private static String full(String d) {
        return switch (d) {
            case "Mon" -> "Monday"; case "Tue" -> "Tuesday"; case "Wed" -> "Wednesday"; case "Thu" -> "Thursday";
            case "Fri" -> "Friday"; case "Sat" -> "Saturday"; default -> "Sunday";
        };
    }

    private static LocalDateTime toServer(LocalDateTime gymLocal, ZoneId zone) {
        return gymLocal.atZone(zone).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    private static OffsetDateTime utc(LocalDateTime server) {
        return server == null ? null : server.atZone(ZoneId.systemDefault()).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static double pct(int n, int total) { return total == 0 ? 0 : round1(n * 100.0 / total); }

    private static double round1(double d) { return Math.round(d * 10) / 10.0; }

    private static String hourLabel(int h) {
        int x = h % 12 == 0 ? 12 : h % 12;
        return x + (h < 12 ? " AM" : " PM");
    }

    private static String hourRange(int h) { return hourLabel(h) + " – " + hourLabel((h + 1) % 24); }

    private static String clock(int h, int m) {
        int x = h % 12 == 0 ? 12 : h % 12;
        return x + ":" + String.format("%02d", m) + (h < 12 ? " AM" : " PM");
    }
}
