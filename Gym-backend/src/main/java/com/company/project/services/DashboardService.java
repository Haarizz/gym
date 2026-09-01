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
import java.util.List;
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

    public DashboardService(
            MemberRepository memberRepository,
            ReceiptRepository receiptRepository,
            AttendanceRepository attendanceRepository,
            StaffRepository staffRepository,
            NotificationService notificationService,
            TrainingSessionRepository trainingSessionRepository,
            BookingRepository bookingRepository,
            LeadRepository leadRepository,
            FollowUpRepository followUpRepository) {
        this.memberRepository = memberRepository;
        this.receiptRepository = receiptRepository;
        this.attendanceRepository = attendanceRepository;
        this.staffRepository = staffRepository;
        this.notificationService = notificationService;
        this.trainingSessionRepository = trainingSessionRepository;
        this.bookingRepository = bookingRepository;
        this.leadRepository = leadRepository;
        this.followUpRepository = followUpRepository;
    }

    public KPIData getKPIs() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startOfLastMonth = startOfMonth.minusMonths(1);
        LocalDateTime startOfToday = now.withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startOfYesterday = startOfToday.minusDays(1);
        LocalDateTime startOf30DaysAgo = now.minusDays(30);
        LocalDateTime startOf60DaysAgo = startOf30DaysAgo.minusDays(30);

        // Revenue MTD vs Last MTD
        BigDecimal revenueMTD = receiptRepository.sumPaidInPeriod(startOfMonth, now);
        BigDecimal revenueLastMTD = receiptRepository.sumPaidInPeriod(startOfLastMonth, startOfMonth);
        double revChange = calculatePercentageChange(revenueMTD, revenueLastMTD);

        // Active Members
        long activeMembers = memberRepository.countByMembershipStatus("active");
        long membersLast30 = memberRepository.countByMembershipStatusAndJoinDateAfter("active", startOf30DaysAgo);
        long membersPrev30 = memberRepository.countByMembershipStatusAndJoinDateAfter("active", startOf60DaysAgo) - membersLast30;
        double membersChange = membersPrev30 == 0 ? (membersLast30 > 0 ? 100.0 : 0.0) : ((double) (membersLast30 - membersPrev30) / membersPrev30) * 100.0;

        // Today's Attendance
        long todayAttendance = attendanceRepository.countByDateRange(startOfToday, now);
        long yesterdayAttendance = attendanceRepository.countByDateRange(startOfYesterday, startOfToday);
        double attChange = calculatePercentageChange(BigDecimal.valueOf(todayAttendance), BigDecimal.valueOf(yesterdayAttendance));

        // Available Staff
        long availableStaff = staffRepository.countByStatus("active"); // or clocked in, depending on schema

        KPIData kpi = new KPIData();
        kpi.setRevenue(revenueMTD != null ? revenueMTD : BigDecimal.ZERO);
        kpi.setRevenueChange(revChange);
        kpi.setActiveMembers(activeMembers);
        kpi.setMembersChange(membersChange);
        kpi.setTodayAttendance(todayAttendance);
        kpi.setAttendanceChange(attChange);
        kpi.setAvailableStaff(availableStaff);

        return kpi;
    }

    public List<RevenueDataPoint> getRevenueData() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        List<Receipt> receiptsToday = receiptRepository.findPaidSince(startOfDay);

        // Group by 3-hour blocks or similar for intraday
        List<RevenueDataPoint> points = new ArrayList<>();
        int[] hours = {9, 12, 15, 18, 21};
        BigDecimal cumulative = BigDecimal.ZERO;

        for (int h : hours) {
            LocalDateTime blockEnd = startOfDay.plusHours(h);
            BigDecimal blockSum = receiptsToday.stream()
                    .filter(r -> r.getTransactionDate().isBefore(blockEnd) || r.getTransactionDate().equals(blockEnd))
                    .map(Receipt::getPaidAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            points.add(new RevenueDataPoint(h + (h < 12 ? " AM" : (h == 12 ? " PM" : " PM")), blockSum, blockSum.multiply(BigDecimal.valueOf(1.2)))); // Mock target
        }
        return points;
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
            dm.setId(m.getMemberId());
            dm.setName(m.getName());
            dm.setEmail(m.getEmail());
            dm.setPhone(m.getPhone());
            dm.setMembershipType(m.getMembershipType());
            dm.setJoinDate(m.getJoinDate() != null ? m.getJoinDate().toLocalDate().toString() : "");
            dm.setStatus(m.getMembershipStatus());
            return dm;
        }).collect(Collectors.toList());
    }

    public List<Object> getNotifications() {
        List<NotificationResponseDTO> notifs = notificationService.getForCurrentUser(0, 5).getContent();
        return notifs.stream().map(n -> {
            // Map DTO to anonymous object for quick JSON
            return new Object() {
                public String id = n.getId().toString();
                public String type = mapNotificationType(n.getType());
                public String title = n.getTitle();
                public String message = n.getMessage();
                public String timestamp = n.getCreatedAt().toString();
                public boolean isRead = n.isRead();
                public String actionUrl = n.getActionUrl();
            };
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

    public List<Object> getStaffStatus() {
        List<Staff> staffs = staffRepository.findTop5ByOrderByCreatedAtDesc();
        return staffs.stream().map(s -> {
            return new Object() {
                public String id = s.getStaffId();
                public String name = s.getName();
                public String role = s.getRole();
                public String status = s.getStatus() != null ? s.getStatus().toLowerCase() : "available";
                public boolean clockedIn = "active".equalsIgnoreCase(s.getStatus());
            };
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
        List<com.company.project.entities.FollowUp> followUps = followUpRepository.findTop5ByStatusOrderByDueDateAsc("pending");
        return followUps.stream().map(f -> {
            PendingTask pt = new PendingTask();
            pt.setId(f.getFollowUpId());
            pt.setLeadName(f.getLead() != null
                    ? (f.getLead().getFirstName() + " " + (f.getLead().getLastName() != null ? f.getLead().getLastName() : "")).trim()
                    : "Unknown");
            pt.setType(f.getType() != null ? f.getType() : "General");
            pt.setDueDate(f.getDueDate() != null ? f.getDueDate().toLocalDate().toString() : "");
            pt.setPriority("High"); // You can map this dynamically if priority exists in FollowUp entity
            pt.setSubject(f.getNotes() != null && f.getNotes().length() > 20 ? f.getNotes().substring(0, 20) + "..." : f.getNotes());
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
