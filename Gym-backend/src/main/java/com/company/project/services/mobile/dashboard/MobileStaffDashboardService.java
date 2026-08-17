package com.company.project.services.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.StaffDashboardResponseDTO;
import com.company.project.dto.mobile.dashboard.StaffDashboardResponseDTO.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileStaffDashboardService {

    private final StaffRepository staffRepository;
    private final LeadRepository leadRepository;
    private final FollowUpRepository followUpRepository;
    private final AttendanceRepository attendanceRepository;
    private final ReceiptRepository receiptRepository;
    private final StaffTargetRepository staffTargetRepository;

    public MobileStaffDashboardService(
            StaffRepository staffRepository,
            LeadRepository leadRepository,
            FollowUpRepository followUpRepository,
            AttendanceRepository attendanceRepository,
            ReceiptRepository receiptRepository,
            StaffTargetRepository staffTargetRepository) {
        this.staffRepository = staffRepository;
        this.leadRepository = leadRepository;
        this.followUpRepository = followUpRepository;
        this.attendanceRepository = attendanceRepository;
        this.receiptRepository = receiptRepository;
        this.staffTargetRepository = staffTargetRepository;
    }

    public StaffDashboardResponseDTO getStaffDashboard(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);

        // 1. Staff Information
        StaffInfoDTO staffInfo = new StaffInfoDTO(
                staff.getName() != null ? staff.getName() : principal.getUsername(),
                staff.getRole() != null ? staff.getRole() : "Staff",
                staff.getBranch() != null ? staff.getBranch() : "Main Branch"
        );

        // 2. Today's Stats
        StaffTodayStatsDTO todaysStats = computeTodayStats(staff, principal.getUsername(), startOfDay, endOfDay);

        // 3. Urgent Follow-ups
        List<UrgentFollowUpDTO> urgentFollowUps = getUrgentFollowUps(staff);

        // 4. Today's Wins (Recent Conversions)
        List<RecentConversionDTO> recentConversions = getTodayWins(staff, principal.getUsername(), startOfDay, endOfDay);

        // 5. Monthly Summary
        StaffMonthSummaryDTO monthlySummary = computeMonthlySummary(
                staff, principal.getUsername(), today.getYear(), today.getMonthValue(), startOfMonth, startOfNextMonth);

        return new StaffDashboardResponseDTO(
                staffInfo,
                todaysStats,
                urgentFollowUps,
                recentConversions,
                monthlySummary
        );
    }

    private StaffTodayStatsDTO computeTodayStats(
            Staff staff, String username, LocalDateTime startOfDay, LocalDateTime endOfDay) {

        // Leads Added Today
        Specification<Lead> leadTodaySpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startOfDay));
            predicates.add(cb.lessThan(root.get("createdAt"), endOfDay));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        int leadsAdded = (int) leadRepository.count(leadTodaySpec);

        // Follow-ups Completed Today
        Specification<FollowUp> fuCompletedTodaySpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "completed"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("completedDate")),
                            cb.greaterThanOrEqualTo(root.get("completedDate"), startOfDay),
                            cb.lessThan(root.get("completedDate"), endOfDay)),
                    cb.and(cb.isNull(root.get("completedDate")),
                            cb.greaterThanOrEqualTo(root.get("updatedAt"), startOfDay),
                            cb.lessThan(root.get("updatedAt"), endOfDay))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        int followUpsCompleted = (int) followUpRepository.count(fuCompletedTodaySpec);

        // Conversions Today (Leads converted or Paid receipts today)
        Specification<Lead> leadConvertedTodaySpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "converted"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("lastContactDate")),
                            cb.greaterThanOrEqualTo(root.get("lastContactDate"), startOfDay),
                            cb.lessThan(root.get("lastContactDate"), endOfDay)),
                    cb.and(cb.isNull(root.get("lastContactDate")),
                            cb.greaterThanOrEqualTo(root.get("updatedAt"), startOfDay),
                            cb.lessThan(root.get("updatedAt"), endOfDay))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        int leadConversions = (int) leadRepository.count(leadConvertedTodaySpec);

        Specification<Receipt> receiptTodaySpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "Paid"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("transactionDate"), startOfDay),
                            cb.lessThan(root.get("transactionDate"), endOfDay)),
                    cb.and(cb.isNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), startOfDay),
                            cb.lessThan(root.get("createdAt"), endOfDay))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        int paidReceiptsToday = (int) receiptRepository.count(receiptTodaySpec);
        int conversions = Math.max(leadConversions, paidReceiptsToday);

        // Check-ins Today (gym operations check-ins for the day)
        int checkins = (int) attendanceRepository.countByDateRange(startOfDay, endOfDay);

        return new StaffTodayStatsDTO(leadsAdded, followUpsCompleted, conversions, checkins);
    }

    private List<UrgentFollowUpDTO> getUrgentFollowUps(Staff staff) {
        Specification<FollowUp> urgentSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(root.get("status").in("pending", "overdue"));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<FollowUp> followUps = followUpRepository.findAll(
                urgentSpec,
                PageRequest.of(0, 10, Sort.by("dueDate").ascending())
        ).getContent();

        // If no follow-ups assigned specifically to this staff, query general high/pending follow-ups
        if (followUps.isEmpty()) {
            Specification<FollowUp> generalSpec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                predicates.add(root.get("status").in("pending", "overdue"));
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            followUps = followUpRepository.findAll(
                    generalSpec,
                    PageRequest.of(0, 5, Sort.by("dueDate").ascending())
            ).getContent();
        }

        // Sort prioritizing high priority items first, then earliest due date
        List<FollowUp> sortedFollowUps = new ArrayList<>(followUps);
        sortedFollowUps.sort((a, b) -> {
            int pA = "high".equalsIgnoreCase(a.getPriority()) ? 1 : ("medium".equalsIgnoreCase(a.getPriority()) ? 2 : 3);
            int pB = "high".equalsIgnoreCase(b.getPriority()) ? 1 : ("medium".equalsIgnoreCase(b.getPriority()) ? 2 : 3);
            if (pA != pB) return Integer.compare(pA, pB);
            if (a.getDueDate() != null && b.getDueDate() != null) {
                return a.getDueDate().compareTo(b.getDueDate());
            }
            return 0;
        });

        return sortedFollowUps.stream()
                .limit(5)
                .map(this::mapToUrgentFollowUpDTO)
                .collect(Collectors.toList());
    }

    private UrgentFollowUpDTO mapToUrgentFollowUpDTO(FollowUp fu) {
        Lead lead = fu.getLead();
        String name = lead != null
                ? (lead.getFirstName() + (lead.getLastName() != null ? " " + lead.getLastName() : "")).trim()
                : (fu.getSubject() != null ? fu.getSubject() : "Prospect");

        String phone = lead != null && lead.getPhone() != null ? lead.getPhone() : "";

        String inquiry = fu.getMembershipPlan() != null && !fu.getMembershipPlan().isBlank()
                ? fu.getMembershipPlan()
                : (lead != null && lead.getMembershipInterest() != null && !lead.getMembershipInterest().isBlank()
                ? lead.getMembershipInterest()
                : (fu.getSubject() != null && !fu.getSubject().isBlank()
                ? fu.getSubject()
                : (fu.getFollowUpReason() != null && !fu.getFollowUpReason().isBlank()
                ? fu.getFollowUpReason()
                : "Membership Inquiry")));

        LocalDateTime lastContactDate = lead != null && lead.getLastContactDate() != null
                ? lead.getLastContactDate()
                : fu.getCreatedAt();

        String lastContact = formatRelativeTime(lastContactDate);
        String priority = fu.getPriority() != null ? fu.getPriority().toLowerCase() : "medium";

        return new UrgentFollowUpDTO(fu.getId(), name, phone, inquiry, lastContact, priority);
    }

    private List<RecentConversionDTO> getTodayWins(
            Staff staff, String username, LocalDateTime startOfDay, LocalDateTime endOfDay) {

        Specification<Receipt> winsSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "Paid"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("transactionDate"), startOfDay),
                            cb.lessThan(root.get("transactionDate"), endOfDay)),
                    cb.and(cb.isNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), startOfDay),
                            cb.lessThan(root.get("createdAt"), endOfDay))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Receipt> receipts = receiptRepository.findAll(
                winsSpec,
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        // If no receipts for this staff today, check all paid receipts today
        if (receipts.isEmpty()) {
            Specification<Receipt> generalWinsSpec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                predicates.add(cb.equal(root.get("status"), "Paid"));
                predicates.add(cb.or(
                        cb.and(cb.isNotNull(root.get("transactionDate")),
                                cb.greaterThanOrEqualTo(root.get("transactionDate"), startOfDay),
                                cb.lessThan(root.get("transactionDate"), endOfDay)),
                        cb.and(cb.isNull(root.get("transactionDate")),
                                cb.greaterThanOrEqualTo(root.get("createdAt"), startOfDay),
                                cb.lessThan(root.get("createdAt"), endOfDay))
                ));
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            receipts = receiptRepository.findAll(
                    generalWinsSpec,
                    PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))
            ).getContent();
        }

        return receipts.stream()
                .map(r -> new RecentConversionDTO(
                        r.getId(),
                        r.getMemberName() != null ? r.getMemberName() : "Member",
                        r.getPlanName() != null && !r.getPlanName().isBlank()
                                ? r.getPlanName()
                                : (r.getTransactionType() != null ? r.getTransactionType() : "Membership"),
                        formatCurrency(r.getPaidAmount() != null ? r.getPaidAmount() : r.getAmount())
                ))
                .collect(Collectors.toList());
    }

    private StaffMonthSummaryDTO computeMonthlySummary(
            Staff staff, String username, int year, int month,
            LocalDateTime startOfMonth, LocalDateTime startOfNextMonth) {

        Optional<StaffTarget> targetOpt = staffTargetRepository.findByStaff_IdAndYearAndMonth(staff.getId(), year, month);

        if (targetOpt.isPresent()) {
            StaffTarget target = targetOpt.get();

            BigDecimal revenueTarget = target.getRevenueTarget() != null ? target.getRevenueTarget() : BigDecimal.ZERO;
            BigDecimal revenueAchieved = target.getRevenueAchieved() != null ? target.getRevenueAchieved() : BigDecimal.ZERO;
            int newClientsTarget = target.getNewClientsTarget() != null ? target.getNewClientsTarget() : 0;
            int newClientsAchieved = target.getNewClientsAchieved() != null ? target.getNewClientsAchieved() : 0;

            int targetAchievement = 0;
            if (revenueTarget.compareTo(BigDecimal.ZERO) > 0) {
                targetAchievement = (int) Math.round((revenueAchieved.doubleValue() / revenueTarget.doubleValue()) * 100);
            } else if (newClientsTarget > 0) {
                targetAchievement = (int) Math.round(((double) newClientsAchieved / newClientsTarget) * 100);
            }

            int conversionRate = computeMonthlyConversionRate(staff, username, startOfMonth, startOfNextMonth);
            if (conversionRate == 0 && target.getForecast() != null && target.getForecast() > 0) {
                conversionRate = target.getForecast();
            }

            return new StaffMonthSummaryDTO(
                    targetAchievement,
                    newClientsAchieved,
                    formatShortRevenue(revenueAchieved),
                    conversionRate
            );
        }

        // Live calculation if no explicit StaffTarget entity is seeded
        Specification<Receipt> monthReceiptsSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "Paid"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("transactionDate"), startOfMonth),
                            cb.lessThan(root.get("transactionDate"), startOfNextMonth)),
                    cb.and(cb.isNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), startOfMonth),
                            cb.lessThan(root.get("createdAt"), startOfNextMonth))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Receipt> monthReceipts = receiptRepository.findAll(monthReceiptsSpec);
        BigDecimal totalRevenue = monthReceipts.stream()
                .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalConversions = monthReceipts.size();

        int targetAchievement = 0;
        BigDecimal monthlyTarget = staff.getMonthlyTarget();
        if (monthlyTarget != null && monthlyTarget.compareTo(BigDecimal.ZERO) > 0) {
            targetAchievement = (int) Math.round((totalRevenue.doubleValue() / monthlyTarget.doubleValue()) * 100);
        }

        int conversionRate = computeMonthlyConversionRate(staff, username, startOfMonth, startOfNextMonth);

        return new StaffMonthSummaryDTO(
                targetAchievement,
                totalConversions,
                formatShortRevenue(totalRevenue),
                conversionRate
        );
    }

    private int computeMonthlyConversionRate(
            Staff staff, String username, LocalDateTime startOfMonth, LocalDateTime startOfNextMonth) {

        Specification<Lead> monthLeadsSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startOfMonth));
            predicates.add(cb.lessThan(root.get("createdAt"), startOfNextMonth));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        long totalLeads = leadRepository.count(monthLeadsSpec);
        if (totalLeads == 0) return 0;

        Specification<Lead> monthConvertedSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "converted"));
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startOfMonth));
            predicates.add(cb.lessThan(root.get("createdAt"), startOfNextMonth));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        long convertedLeads = leadRepository.count(monthConvertedSpec);
        return (int) Math.round(((double) convertedLeads / totalLeads) * 100);
    }

    private String formatRelativeTime(LocalDateTime date) {
        if (date == null) return "Never";
        LocalDate targetDate = date.toLocalDate();
        LocalDate today = LocalDate.now();
        long days = ChronoUnit.DAYS.between(targetDate, today);

        if (days <= 0) return "Today";
        if (days == 1) return "1 day ago";
        if (days < 30) return days + " days ago";
        return date.format(DateTimeFormatter.ofPattern("MMM d"));
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "₹0";
        return "₹" + String.format("%,d", amount.longValue());
    }

    private String formatShortRevenue(BigDecimal revenue) {
        if (revenue == null || revenue.compareTo(BigDecimal.ZERO) == 0) return "₹0";
        double val = revenue.doubleValue();
        if (val >= 100000) {
            double lakhs = val / 100000.0;
            if (lakhs == (long) lakhs) {
                return String.format(Locale.US, "₹%dL", (long) lakhs);
            } else {
                return String.format(Locale.US, "₹%.1fL", lakhs);
            }
        }
        return "₹" + String.format("%,d", revenue.longValue());
    }
}
