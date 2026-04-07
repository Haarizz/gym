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
import java.time.format.TextStyle;
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
