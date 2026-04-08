package com.company.project.services;

import com.company.project.dto.*;
import com.company.project.entities.Attendance;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final MemberRepository memberRepository;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             MemberRepository memberRepository) {
        this.attendanceRepository = attendanceRepository;
        this.memberRepository     = memberRepository;
    }

    // ── List / search ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getAttendance(String date, String startDate, String endDate, String search, int page, int size) {
        LocalDateTime start, end;
        if (StringUtils.hasText(startDate) && StringUtils.hasText(endDate)) {
            start = LocalDate.parse(startDate).atStartOfDay();
            end   = LocalDate.parse(endDate).atTime(LocalTime.MAX);
        } else {
            LocalDate targetDate = StringUtils.hasText(date) ? LocalDate.parse(date) : LocalDate.now();
            start = targetDate.atStartOfDay();
            end   = targetDate.atTime(LocalTime.MAX);
        }

        Page<Attendance> pageResult = attendanceRepository.findByDateRangeAndSearch(
                start, end,
                StringUtils.hasText(search) ? search : null,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "checkInTime"))
        );

        return Map.of(
                "items",      pageResult.getContent().stream().map(this::toListItem).toList(),
                "total",      pageResult.getTotalElements(),
                "page",       page,
                "size",       size,
                "totalPages", pageResult.getTotalPages()
        );
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AttendanceStatsDTO getStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay   = LocalDate.now().atTime(LocalTime.MAX);

        List<Attendance> today = attendanceRepository.findByDateRange(startOfDay, endOfDay);

        long activeNow = today.stream().filter(a -> "active".equals(a.getStatus())).count();

        double avgMinutes = today.stream()
                .filter(a -> a.getTotalMinutes() != null)
                .mapToInt(Attendance::getTotalMinutes)
                .average()
                .orElse(0.0);

        // Peak hour
        Map<Integer, Long> hourMap = today.stream()
                .collect(Collectors.groupingBy(a -> a.getCheckInTime().getHour(), Collectors.counting()));
        String peakHour = hourMap.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(e -> formatHour(e.getKey()))
                .orElse("—");

        long totalActive = memberRepository.countByMembershipStatus("active");
        double rate = totalActive > 0 ? Math.round((today.size() * 100.0 / totalActive) * 10) / 10.0 : 0;

        AttendanceStatsDTO stats = new AttendanceStatsDTO();
        stats.setTodayVisits(today.size());
        stats.setActiveNow(activeNow);
        stats.setAvgDurationMinutes(Math.round(avgMinutes * 10) / 10.0);
        stats.setPeakHour(peakHour);
        stats.setAttendanceRate(rate);
        stats.setTotalActiveMembers(totalActive);
        stats.setWeeklyTrend(buildWeeklyTrend());
        stats.setMonthlyTrend(buildMonthlyTrend());
        return stats;
    }

    // ── Checkout ──────────────────────────────────────────────────────────────

    @Transactional
    public CheckOutResponse checkout(Long attendanceId) {
        Attendance record = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found: " + attendanceId));

        if (!"active".equals(record.getStatus())) {
            throw new RuntimeException("Already checked out");
        }

        LocalDateTime now = LocalDateTime.now();
        int minutes = (int) Duration.between(record.getCheckInTime(), now).toMinutes();
        record.setCheckOutTime(now);
        record.setTotalMinutes(minutes);
        record.setStatus("completed");
        attendanceRepository.save(record);

        CheckOutResponse resp = new CheckOutResponse();
        resp.setSuccess(true);
        resp.setMessage("Checked out successfully");
        resp.setAttendanceId(attendanceId);
        resp.setCheckOutTime(now);
        resp.setTotalMinutes(minutes);
        resp.setFormattedDuration(formatDuration(minutes));
        return resp;
    }

    // ── Walk-in check-in ──────────────────────────────────────────────────────

    @Transactional
    public CheckInResponse walkInCheckIn(WalkInCheckInRequest req) {
        if (!StringUtils.hasText(req.getName()) || !StringUtils.hasText(req.getPhone())) {
            throw new IllegalArgumentException("Name and phone are required for walk-in");
        }

        Attendance record = new Attendance();
        record.setType("walk_in");
        record.setStatus("active");
        record.setCheckInTime(LocalDateTime.now());
        record.setCheckInMethod("manual");
        record.setDeviceId(StringUtils.hasText(req.getDeviceId()) ? req.getDeviceId() : "WEB");
        record.setResolvedBy("walk_in_form");
        record.setWalkInName(req.getName());
        record.setWalkInPhone(req.getPhone());
        record.setWalkInEmail(req.getEmail());
        record.setActivityType(req.getSessionType());
        record.setWalkInPaymentStatus(StringUtils.hasText(req.getPaymentStatus()) ? req.getPaymentStatus() : "pending");
        record.setNotes(req.getNotes());
        attendanceRepository.save(record);

        CheckInResponse resp = new CheckInResponse();
        resp.setSuccess(true);
        resp.setMessage("Walk-in access granted to " + req.getName());
        resp.setAttendanceId(record.getId());
        resp.setMemberName(req.getName());
        resp.setCheckInTime(record.getCheckInTime());
        resp.setCheckInMethod("manual");
        resp.setResolvedBy("walk_in_form");
        return resp;
    }

    // ── Reports ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getReport(String startDate, String endDate) {
        LocalDate start = StringUtils.hasText(startDate) ? LocalDate.parse(startDate) : LocalDate.now().minusDays(30);
        LocalDate end   = StringUtils.hasText(endDate)   ? LocalDate.parse(endDate)   : LocalDate.now();

        List<Attendance> records = attendanceRepository.findByDateRange(
                start.atStartOfDay(), end.plusDays(1).atStartOfDay());

        long totalActiveMembers = memberRepository.countByMembershipStatus("active");
        long totalDays = ChronoUnit.DAYS.between(start, end) + 1;

        // ── Daily summary ─────────────────────────────────────────────────────
        Map<LocalDate, List<Attendance>> byDay = records.stream()
                .collect(Collectors.groupingBy(a -> a.getCheckInTime().toLocalDate()));

        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("MMM d");
        List<Map<String, Object>> dailySummary = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            List<Attendance> dayRecs = byDay.getOrDefault(day, List.of());
            OptionalDouble avgDur = dayRecs.stream()
                    .filter(a -> a.getTotalMinutes() != null)
                    .mapToInt(Attendance::getTotalMinutes).average();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",        day.format(dayFmt));
            entry.put("fullDate",    day.toString());
            entry.put("visits",      dayRecs.size());
            entry.put("avgDuration", avgDur.isPresent() ? (long) Math.round(avgDur.getAsDouble()) : 0L);
            dailySummary.add(entry);
        }

        // ── Activity breakdown ────────────────────────────────────────────────
        Map<String, Long> actCounts = records.stream()
                .filter(a -> StringUtils.hasText(a.getActivityType()))
                .collect(Collectors.groupingBy(Attendance::getActivityType, Collectors.counting()));
        long totalWithActivity = actCounts.values().stream().mapToLong(Long::longValue).sum();
        List<Map<String, Object>> activityBreakdown = actCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("type",       e.getKey());
                    m.put("count",      e.getValue());
                    m.put("percentage", totalWithActivity > 0
                            ? Math.round((e.getValue() * 100.0 / totalWithActivity) * 10) / 10.0 : 0.0);
                    return m;
                })
                .collect(Collectors.toList());

        // ── Peak hours by day-of-week matrix ──────────────────────────────────
        // dayNames index: Mon=1, Tue=2, … Sun=0 (DayOfWeek.getValue() % 7)
        String[] dayNames = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
        int[][] hourDayMatrix = new int[24][7];
        int[] hourTotals = new int[24];
        for (Attendance a : records) {
            int h   = a.getCheckInTime().getHour();
            int dow = a.getCheckInTime().getDayOfWeek().getValue() % 7;
            hourDayMatrix[h][dow]++;
            hourTotals[h]++;
        }
        List<Map<String, Object>> peakHours = new ArrayList<>();
        for (int h = 6; h <= 22; h++) {
            int displayH = h % 12 == 0 ? 12 : h % 12;
            String ampm  = h < 12 ? "am" : "pm";
            Map<String, Object> hourData = new LinkedHashMap<>();
            hourData.put("hour",  displayH + ampm);
            hourData.put("label", displayH + ":00 " + (h < 12 ? "AM" : "PM"));
            for (int d = 0; d < 7; d++) hourData.put(dayNames[d], hourDayMatrix[h][d]);
            peakHours.add(hourData);
        }

        // ── Facility breakdown (derived from activity_type) ───────────────────
        Map<String, long[]> facilityMap = new LinkedHashMap<>();
        facilityMap.put("Cardio Area",  new long[]{0});
        facilityMap.put("Weight Area",  new long[]{0});
        facilityMap.put("Studio",       new long[]{0});
        facilityMap.put("Pool",         new long[]{0});
        facilityMap.put("General",      new long[]{0});
        for (Attendance a : records) {
            String act = a.getActivityType();
            if (!StringUtils.hasText(act)) { facilityMap.get("General")[0]++; continue; }
            String lo = act.toLowerCase();
            if (lo.contains("cardio") || lo.contains("cycling") || lo.contains("treadmill") || lo.contains("running"))
                facilityMap.get("Cardio Area")[0]++;
            else if (lo.contains("weight") || lo.contains("strength") || lo.contains("power") || lo.contains("bodybuilding") || lo.contains("gym"))
                facilityMap.get("Weight Area")[0]++;
            else if (lo.contains("yoga") || lo.contains("pilates") || lo.contains("zumba") || lo.contains("dance") || lo.contains("martial") || lo.contains("aerobic") || lo.contains("studio"))
                facilityMap.get("Studio")[0]++;
            else if (lo.contains("swim") || lo.contains("pool") || lo.contains("aqua"))
                facilityMap.get("Pool")[0]++;
            else
                facilityMap.get("General")[0]++;
        }
        long totalFacility = facilityMap.values().stream().mapToLong(v -> v[0]).sum();
        String[] facilityColors = {"#0047AB", "#00c5cb", "#FFC107", "#4CAF50", "#9E9E9E"};
        List<String> facilityKeys = new ArrayList<>(facilityMap.keySet());
        List<Map<String, Object>> facilityBreakdown = new ArrayList<>();
        for (int i = 0; i < facilityKeys.size(); i++) {
            long cnt = facilityMap.get(facilityKeys.get(i))[0];
            if (cnt > 0 || totalFacility == 0) {
                Map<String, Object> fm = new LinkedHashMap<>();
                fm.put("name",  facilityKeys.get(i));
                fm.put("value", totalFacility > 0 ? Math.round((cnt * 100.0 / totalFacility) * 10) / 10.0 : 0.0);
                fm.put("count", cnt);
                fm.put("color", facilityColors[i % facilityColors.length]);
                facilityBreakdown.add(fm);
            }
        }

        // ── Monthly trend ─────────────────────────────────────────────────────
        Map<String, Long> monthlyVisits = new LinkedHashMap<>();
        for (Attendance a : records) {
            String key = a.getCheckInTime().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            monthlyVisits.merge(key, 1L, Long::sum);
        }
        List<Map<String, Object>> monthlyTrend = monthlyVisits.entrySet().stream()
                .map(e -> Map.<String, Object>of("month", e.getKey(), "visits", e.getValue()))
                .collect(Collectors.toList());

        // ── Member consistency ────────────────────────────────────────────────
        Map<Long, Object[]> memberVisitMap = new HashMap<>();
        for (Attendance a : records) {
            if (a.getMember() == null) continue;
            Long mid = a.getMember().getId();
            memberVisitMap.merge(mid,
                    new Object[]{a.getMember().getName(), 1L},
                    (ex, nv) -> { ex[1] = (Long) ex[1] + 1L; return ex; });
        }
        List<Map<String, Object>> memberList = memberVisitMap.entrySet().stream()
                .map(e -> {
                    Object[] d   = e.getValue();
                    long visits  = (Long) d[1];
                    double rate  = Math.min(100.0, Math.round((visits * 100.0 / totalDays) * 10) / 10.0);
                    Map<String, Object> mm = new LinkedHashMap<>();
                    mm.put("id",             e.getKey());
                    mm.put("name",           d[0]);
                    mm.put("visits",         visits);
                    mm.put("attendanceRate", rate);
                    return mm;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> topConsistentMembers = memberList.stream()
                .sorted(Comparator.comparingLong(m -> -((Long) m.get("visits"))))
                .limit(5).collect(Collectors.toList());
        List<Map<String, Object>> irregularMembers = memberList.stream()
                .filter(m -> ((Long) m.get("visits")) > 0)
                .sorted(Comparator.comparingLong(m -> ((Long) m.get("visits"))))
                .limit(5).collect(Collectors.toList());

        // ── Summary ───────────────────────────────────────────────────────────
        long totalVisits = records.size();
        double avgDaily  = Math.round((totalVisits * 10.0 / Math.max(1, totalDays))) / 10.0;
        double avgRate   = totalActiveMembers > 0
                ? Math.min(100.0, Math.round((totalVisits * 100.0 / (totalActiveMembers * totalDays)) * 10) / 10.0)
                : 0.0;
        int peakH = 0;
        for (int h = 1; h < 24; h++) if (hourTotals[h] > hourTotals[peakH]) peakH = h;

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalVisits",         totalVisits);
        summary.put("avgDailyVisits",      avgDaily);
        summary.put("attendanceRate",      avgRate);
        summary.put("peakHour",            formatHour(peakH));
        summary.put("totalActiveMembers",  totalActiveMembers);
        summary.put("daysInRange",         totalDays);

        return Map.of(
                "dailySummary",          dailySummary,
                "activityBreakdown",     activityBreakdown,
                "peakHours",             peakHours,
                "monthlyTrend",          monthlyTrend,
                "topConsistentMembers",  topConsistentMembers,
                "irregularMembers",      irregularMembers,
                "facilityBreakdown",     facilityBreakdown,
                "insights",              generateInsights(records, hourTotals),
                "summary",               summary
        );
    }

    private List<Map<String, Object>> generateInsights(List<Attendance> records, int[] hourTotals) {
        List<Map<String, Object>> insights = new ArrayList<>();
        if (records.isEmpty()) {
            insights.add(Map.of("id", 1, "type", "info",
                    "title", "No Data Available",
                    "message", "No attendance records found for the selected period."));
            return insights;
        }

        // Peak day of week
        Map<DayOfWeek, Long> byDow = records.stream()
                .collect(Collectors.groupingBy(a -> a.getCheckInTime().getDayOfWeek(), Collectors.counting()));
        DayOfWeek peakDay    = byDow.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(DayOfWeek.MONDAY);
        DayOfWeek offPeakDay = byDow.entrySet().stream().min(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(DayOfWeek.SUNDAY);
        String peakDayName    = peakDay.getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        String offPeakDayName = offPeakDay.getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        insights.add(Map.of("id", 1, "type", "success",
                "title", "Peak Engagement Detected",
                "message", peakDayName + "s see the highest attendance — schedule additional group classes or assign extra trainers for better coverage."));

        // Morning vs evening comparison
        long morningVisits = 0, eveningVisits = 0;
        for (int h = 5;  h <= 11; h++) morningVisits += hourTotals[h];
        for (int h = 17; h <= 21; h++) eveningVisits += hourTotals[h];
        if (morningVisits < eveningVisits / 2 && eveningVisits > 0) {
            insights.add(Map.of("id", 2, "type", "warning",
                    "title", "Morning Slot Underutilized",
                    "message", "Morning attendance is significantly lower than evenings. Consider early-bird promotions or push notifications to boost morning visits."));
        } else if (eveningVisits > morningVisits * 2 && morningVisits > 0) {
            insights.add(Map.of("id", 2, "type", "warning",
                    "title", "Evening Overcrowding Risk",
                    "message", "Evening hours are significantly busier than mornings. Consider incentives for off-peak visits to balance facility load."));
        } else {
            insights.add(Map.of("id", 2, "type", "info",
                    "title", "Balanced Attendance Distribution",
                    "message", "Attendance is fairly distributed across the day. Both morning and evening slots show healthy engagement."));
        }

        insights.add(Map.of("id", 3, "type", "info",
                "title", "Off-Peak Opportunity",
                "message", offPeakDayName + "s are consistently the least busy. Consider promotional sessions or discounts on " + offPeakDayName + "s to improve overall utilization."));

        return insights;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public AttendanceListItemDTO toListItem(Attendance a) {
        AttendanceListItemDTO dto = new AttendanceListItemDTO();
        dto.setId(a.getId());
        dto.setCheckInTime(a.getCheckInTime());
        dto.setCheckOutTime(a.getCheckOutTime());
        dto.setTotalMinutes(a.getTotalMinutes());
        dto.setFormattedDuration(a.getTotalMinutes() != null ? formatDuration(a.getTotalMinutes()) : null);
        dto.setActivityType(a.getActivityType());
        dto.setStatus(a.getStatus());
        dto.setType(a.getType());
        dto.setCheckInMethod(a.getCheckInMethod());
        dto.setDeviceId(a.getDeviceId());

        if ("walk_in".equals(a.getType())) {
            dto.setWalkInName(a.getWalkInName());
            dto.setWalkInPhone(a.getWalkInPhone());
            dto.setWalkInEmail(a.getWalkInEmail());
            dto.setWalkInPaymentStatus(a.getWalkInPaymentStatus());
        } else if (a.getMember() != null) {
            var m = a.getMember();
            dto.setMemberDbId(m.getId());
            dto.setMemberBizId(m.getMemberId());
            dto.setMemberName(m.getName());
            dto.setPhotoUrl(m.getPhotoUrl());
            dto.setMembershipType(m.getMembershipType());
        }
        return dto;
    }

    public static String formatDuration(int minutes) {
        if (minutes < 60) return minutes + "m";
        return (minutes / 60) + "h " + (minutes % 60) + "m";
    }

    private String formatHour(int hour) {
        int h = hour % 12 == 0 ? 12 : hour % 12;
        String ampm = hour < 12 ? "AM" : "PM";
        int nextH = (hour + 1) % 12 == 0 ? 12 : (hour + 1) % 12;
        String nextAmPm = (hour + 1) < 12 ? "AM" : "PM";
        return h + ":00 " + ampm + " - " + nextH + ":00 " + nextAmPm;
    }

    private List<Map<String, Object>> buildWeeklyTrend() {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day = weekStart.plusDays(i);
            long count = attendanceRepository.countByDateRange(
                    day.atStartOfDay(), day.atTime(LocalTime.MAX));
            result.add(Map.of(
                    "day",   day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    "visits", count,
                    "date",  day.toString()
            ));
        }
        return result;
    }

    private List<Map<String, Object>> buildMonthlyTrend() {
        int year = LocalDate.now().getYear();
        List<Map<String, Object>> result = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            LocalDate first = LocalDate.of(year, m, 1);
            LocalDate last  = first.withDayOfMonth(first.lengthOfMonth());
            long count = attendanceRepository.countByDateRange(
                    first.atStartOfDay(), last.atTime(LocalTime.MAX));
            result.add(Map.of(
                    "month",  first.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    "visits", count
            ));
        }
        return result;
    }
}
