package com.company.project.services;

import com.company.project.dto.NotificationResponseDTO;
import com.company.project.dto.dashboard.DashboardDTOs.*;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.entities.Staff;
import com.company.project.entities.TrainingSession;
import com.company.project.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final MemberRepository memberRepository;
    private final ReceiptRepository receiptRepository;
    private final AttendanceRepository attendanceRepository;
    private final StaffRepository staffRepository;
    private final NotificationService notificationService;
    private final TrainingSessionRepository trainingSessionRepository;
    private final BookingRepository bookingRepository;
    private final LeadRepository leadRepository;
    private final FollowUpRepository followUpRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final RevenueDashboardService revenueDashboardService;

    public DashboardService(
            MemberRepository memberRepository,
            ReceiptRepository receiptRepository,
            AttendanceRepository attendanceRepository,
            StaffRepository staffRepository,
            NotificationService notificationService,
            TrainingSessionRepository trainingSessionRepository,
            BookingRepository bookingRepository,
            LeadRepository leadRepository,
            FollowUpRepository followUpRepository,
            StaffAttendanceRepository staffAttendanceRepository,
            RevenueDashboardService revenueDashboardService) {
        this.memberRepository = memberRepository;
        this.receiptRepository = receiptRepository;
        this.attendanceRepository = attendanceRepository;
        this.staffRepository = staffRepository;
        this.notificationService = notificationService;
        this.trainingSessionRepository = trainingSessionRepository;
        this.bookingRepository = bookingRepository;
        this.leadRepository = leadRepository;
        this.followUpRepository = followUpRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.revenueDashboardService = revenueDashboardService;
    }

    /**
     * The Overview tab's period selector: "today", "week" (last 7 days incl. today),
     * "month" (this calendar month) and "lastMonth". Each is compared with the
     * period of the same kind immediately before it.
     */
    record Period(LocalDate from, LocalDate to, LocalDate prevFrom, LocalDate prevTo, String key) {
        LocalDateTime start() { return from.atStartOfDay(); }
        LocalDateTime end() { return to.plusDays(1).atStartOfDay(); }
        LocalDateTime prevStart() { return prevFrom.atStartOfDay(); }
        LocalDateTime prevEnd() { return prevTo.plusDays(1).atStartOfDay(); }
    }

    static Period resolvePeriod(String period, LocalDate today) {
        String p = period == null ? "today" : period;
        switch (p) {
            case "week": {
                LocalDate from = today.minusDays(6);
                return new Period(from, today, from.minusDays(7), from.minusDays(1), "week");
            }
            case "month": {
                LocalDate from = today.withDayOfMonth(1);
                LocalDate to = from.plusMonths(1).minusDays(1);
                return new Period(from, to, from.minusMonths(1), from.minusDays(1), "month");
            }
            case "lastMonth": {
                LocalDate from = today.withDayOfMonth(1).minusMonths(1);
                LocalDate to = today.withDayOfMonth(1).minusDays(1);
                return new Period(from, to, from.minusMonths(1), from.minusDays(1), "lastMonth");
            }
            default:
                return new Period(today, today, today.minusDays(1), today.minusDays(1), "today");
        }
    }

    /** This calendar month — what the mobile admin analytics screens have always shown. */
    public KPIData getKPIs() {
        return getKPIs("month");
    }

    public KPIData getKPIs(String period) {
        Period pr = resolvePeriod(period, LocalDate.now());

        // Same cash-basis figure as the Revenue Dashboard tab's Total Collection
        BigDecimal revenue = revenueDashboardService.totalCollection(pr.from(), pr.to());
        BigDecimal previousRevenue = revenueDashboardService.totalCollection(pr.prevFrom(), pr.prevTo());

        long activeMembers = memberRepository.countByMembershipStatus("active");
        long joined = memberRepository.countByJoinDateBetween(pr.start(), pr.end());
        long previousJoined = memberRepository.countByJoinDateBetween(pr.prevStart(), pr.prevEnd());

        long attendance = attendanceRepository.countByDateRange(pr.start(), pr.end());
        long previousAttendance = attendanceRepository.countByDateRange(pr.prevStart(), pr.prevEnd());

        KPIData kpi = new KPIData();
        kpi.setRevenue(revenue);
        kpi.setRevenueChange(calculatePercentageChange(revenue, previousRevenue));
        kpi.setActiveMembers(activeMembers);
        kpi.setMembersChange(calculatePercentageChange(BigDecimal.valueOf(joined), BigDecimal.valueOf(previousJoined)));
        kpi.setTodayAttendance(attendance);
        kpi.setAttendanceChange(calculatePercentageChange(BigDecimal.valueOf(attendance), BigDecimal.valueOf(previousAttendance)));
        kpi.setAvailableStaff(staffRepository.countByStatus("active"));
        kpi.setClockedInStaff(staffAttendanceRepository.findClockedInStaffIds().size());
        return kpi;
    }

    /**
     * Revenue chart points for the period: hourly for "today" (key "time"), daily for
     * "week" (key "day"), weekly for the month options (key "week") — the keys the
     * Overview chart reads for each period.
     */
    public List<Map<String, Object>> getRevenueData(String period) {
        Period pr = resolvePeriod(period, LocalDate.now());
        String bucket = switch (pr.key()) {
            case "today" -> "hourly";
            case "week" -> "daily";
            default -> "weekly";
        };
        String key = switch (pr.key()) {
            case "today" -> "time";
            case "week" -> "day";
            default -> "week";
        };
        DateTimeFormatter dayLabel = DateTimeFormatter.ofPattern("EEE d", Locale.ENGLISH);
        List<Map<String, Object>> points = new ArrayList<>();
        for (Map<String, Object> p : revenueDashboardService.collectionTrend(pr.from(), pr.to(), bucket)) {
            Map<String, Object> point = new LinkedHashMap<>();
            String label = (String) p.get("label");
            if (bucket.equals("daily")) {
                label = LocalDateTime.parse((String) p.get("start")).format(dayLabel);
            }
            point.put(key, label);
            point.put("revenue", p.get("revenue"));
            points.add(point);
        }
        return points;
    }

    /** Check-ins in the period, grouped into four slots that together cover the whole day. */
    public List<Map<String, Object>> getAttendanceBySlot(String period) {
        Period pr = resolvePeriod(period, LocalDate.now());
        String[] names = {"Morning (5-11 AM)", "Midday (11 AM-4 PM)", "Evening (4-10 PM)", "Night (10 PM-5 AM)"};
        long[] counts = new long[4];
        for (LocalDateTime t : attendanceRepository.findCheckInTimesBetween(pr.start(), pr.end())) {
            if (t == null) continue;
            int h = t.getHour();
            int slot = (h >= 5 && h < 11) ? 0 : (h >= 11 && h < 16) ? 1 : (h >= 16 && h < 22) ? 2 : 3;
            counts[slot]++;
        }
        long total = counts[0] + counts[1] + counts[2] + counts[3];
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < names.length; i++) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("type", names[i]);
            row.put("members", counts[i]);
            row.put("percentage", total == 0 ? 0 : Math.round(counts[i] * 100.0 / total));
            rows.add(row);
        }
        return rows;
    }

    public List<MembershipDistribution> getMembershipDistribution() {
        List<Object[]> results = memberRepository.countActiveMembersByType();
        List<MembershipDistribution> dist = new ArrayList<>();
        String[] colors = {"#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899"};
        int i = 0;
        for (Object[] row : results) {
            String name = (String) row[0];
            long count = ((Number) row[1]).longValue();
            BigDecimal sum = (BigDecimal) row[2];
            dist.add(new MembershipDistribution(name != null ? name : "Unknown", count, colors[i % colors.length], sum != null ? sum : BigDecimal.ZERO));
            i++;
        }
        return dist;
    }

    public List<ClassAttendance> getClassAttendance() {
        List<TrainingSession> recentSessions = trainingSessionRepository.findTop5ByStatusOrderByDateDescStartTimeDesc("active");
        List<ClassAttendance> attList = new ArrayList<>();
        for (TrainingSession session : recentSessions) {
            long count = bookingRepository.countBySessionIdAndStatusNot(session.getId(), "cancelled");
            int capacity = session.getCapacity() != null ? session.getCapacity() : 20;
            int percentage = capacity > 0 ? (int) (((double) count / capacity) * 100) : 0;
            attList.add(new ClassAttendance(session.getName(), capacity, (int) count, percentage));
        }
        return attList;
    }

    public List<DashboardMember> getRecentMembers() {
        List<Member> members = memberRepository.findTop5ByOrderByJoinDateDesc();
        return members.stream().map(m -> {
            DashboardMember dm = new DashboardMember();
            // Numeric DB id — the dashboard opens /member-history-analytics with it (see searchMembers)
            dm.setId(String.valueOf(m.getId()));
            dm.setName(m.getName());
            dm.setEmail(m.getEmail());
            dm.setPhone(m.getPhone());
            dm.setMembershipType(m.getMembershipType());
            dm.setJoinDate(m.getJoinDate() != null ? m.getJoinDate().toLocalDate().toString() : "");
            dm.setStatus(m.getMembershipStatus());
            return dm;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getNotifications() {
        List<NotificationResponseDTO> notifs = notificationService.getForCurrentUser(0, 5).getContent();
        return notifs.stream().map(n -> {
            // Map keys aren't touched by the global SNAKE_CASE strategy, so the page reads isRead/actionUrl as-is
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", n.getId().toString());
            m.put("type", mapNotificationType(n.getType()));
            m.put("title", n.getTitle());
            m.put("message", n.getMessage());
            m.put("timestamp", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
            m.put("isRead", n.isRead());
            m.put("actionUrl", n.getActionUrl());
            return m;
        }).collect(Collectors.toList());
    }

    private String mapNotificationType(String backendType) {
        if (backendType == null) return "info";
        return switch (backendType) {
            case "DANGER" -> "alert";
            case "WARNING" -> "warning";
            case "SUCCESS" -> "success";
            default -> "info";
        };
    }

    public List<Map<String, Object>> getStaffStatus() {
        java.util.Set<Long> clockedIn = new java.util.HashSet<>(staffAttendanceRepository.findClockedInStaffIds());
        // Active staff, clocked-in first, so the panel shows who's on the floor right now
        return staffRepository.findByStatusIgnoreCaseOrderByNameAsc("active").stream()
                .sorted((a, b) -> Boolean.compare(clockedIn.contains(b.getId()), clockedIn.contains(a.getId())))
                .limit(10)
                .map(s -> {
                    boolean in = clockedIn.contains(s.getId());
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", s.getStaffId() != null ? s.getStaffId() : String.valueOf(s.getId()));
                    m.put("name", s.getName());
                    m.put("role", s.getRole());
                    m.put("status", in ? "available" : "offline");
                    m.put("clockedIn", in);
                    return m;
                }).collect(Collectors.toList());
    }

    public List<DashboardMember> searchMembers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }
        String search = query.toLowerCase();
        List<Member> all = memberRepository.findAll();
        return all.stream()
                .filter(m -> (m.getName() != null && m.getName().toLowerCase().contains(search)) ||
                             (m.getEmail() != null && m.getEmail().toLowerCase().contains(search)) ||
                             (m.getPhone() != null && m.getPhone().contains(search)))
                .limit(5)
                .map(m -> {
                    DashboardMember dm = new DashboardMember();
                    // The frontend passes this straight through as the numeric DB id
                    // when opening /member-history-analytics (see dashboard.tsx's
                    // handleMemberSelect) — the human-readable MBR-... business id
                    // (m.getMemberId()) doesn't bind to that page's Long path
                    // variable and 400s, which is what "Failed to load this member"
                    // was actually coming from.
                    dm.setId(String.valueOf(m.getId()));
                    dm.setName(m.getName());
                    dm.setEmail(m.getEmail());
                    dm.setPhone(m.getPhone());
                    dm.setMembershipType(m.getMembershipType());
                    dm.setJoinDate(m.getJoinDate() != null ? m.getJoinDate().toLocalDate().toString() : "");
                    dm.setStatus(m.getMembershipStatus());
                    return dm;
                }).collect(Collectors.toList());
    }

    public List<SalesPipeline> getSalesPipeline() {
        List<Object[]> results = leadRepository.countLeadsByStatus();
        List<SalesPipeline> pipeline = new ArrayList<>();
        // Define colors for standard statuses
        java.util.Map<String, String> colors = new java.util.HashMap<>();
        colors.put("new", "#3b82f6");      // blue
        colors.put("contacted", "#f59e0b"); // amber
        colors.put("converted", "#10b981"); // green
        colors.put("lost", "#ef4444");      // red
        
        for (Object[] row : results) {
            String status = (String) row[0];
            long count = ((Number) row[1]).longValue();
            if (status == null) status = "unknown";
            String color = colors.getOrDefault(status.toLowerCase(), "#8b5cf6"); // default purple
            pipeline.add(new SalesPipeline(status, count, color));
        }
        return pipeline;
    }

    public List<PendingTask> getPendingTasks() {
        List<com.company.project.entities.FollowUp> followUps =
                followUpRepository.findTop5ByStatusInOrderByDueDateAsc(List.of("pending", "overdue"));
        return followUps.stream().map(f -> {
            PendingTask pt = new PendingTask();
            // Numeric id: the dashboard's "Resolve" button posts to /follow-ups/{id}/complete
            pt.setId(String.valueOf(f.getId()));
            pt.setLeadName(f.getLead() != null
                    ? (f.getLead().getFirstName() + " " + (f.getLead().getLastName() != null ? f.getLead().getLastName() : "")).trim()
                    : "Unknown");
            pt.setType(f.getType() != null ? f.getType() : "General");
            pt.setDueDate(f.getDueDate() != null ? f.getDueDate().toLocalDate().toString() : "");
            pt.setPriority(f.getPriority() != null ? f.getPriority() : "medium");
            String subject = f.getSubject() != null && !f.getSubject().isBlank() ? f.getSubject() : f.getNotes();
            pt.setSubject(subject != null && subject.length() > 60 ? subject.substring(0, 60) + "..." : subject);
            return pt;
        }).collect(Collectors.toList());
    }

    private double calculatePercentageChange(BigDecimal current, BigDecimal previous) {
        if (previous == null) previous = BigDecimal.ZERO;
        if (current == null) current = BigDecimal.ZERO;
        if (previous.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        BigDecimal diff = current.subtract(previous);
        return diff.divide(previous, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();
    }

    public List<MemberChurnData> getMemberChurnData() {
        List<MemberChurnData> churnDataList = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM");
        
        for (int i = 5; i >= 0; i--) {
            LocalDateTime startOfMonth = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime endOfMonth = startOfMonth.plusMonths(1).minusNanos(1);
            
            // Note: Since we don't have explicit churn tracking, we use expired or cancelled statuses in that month
            long newMembers = memberRepository.countByJoinDateBetween(startOfMonth, endOfMonth);
            long churnedMembers = memberRepository.countByMembershipStatusAndExpiryDateBetween("expired", startOfMonth, endOfMonth) +
                                  memberRepository.countByMembershipStatusAndExpiryDateBetween("cancelled", startOfMonth, endOfMonth);
            
            churnDataList.add(new MemberChurnData(startOfMonth.format(formatter), (int)newMembers, (int)churnedMembers));
        }
        return churnDataList;
    }
}
