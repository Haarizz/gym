package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class MobileTrainerLedgerService {

    private final StaffRepository staffRepository;
    private final StaffTargetRepository staffTargetRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository;
    private final CommissionRuleRepository commissionRuleRepository;
    private final ReceiptRepository receiptRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public MobileTrainerLedgerService(
            StaffRepository staffRepository,
            StaffTargetRepository staffTargetRepository,
            SalaryPaymentRepository salaryPaymentRepository,
            SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository,
            CommissionRuleRepository commissionRuleRepository,
            ReceiptRepository receiptRepository) {
        this.staffRepository = staffRepository;
        this.staffTargetRepository = staffTargetRepository;
        this.salaryPaymentRepository = salaryPaymentRepository;
        this.salaryPaymentEmployeeRepository = salaryPaymentEmployeeRepository;
        this.commissionRuleRepository = commissionRuleRepository;
        this.receiptRepository = receiptRepository;
    }

    public TrainerLedgerResponseDTO getTrainerLedger(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));

        LocalDate today = LocalDate.now();
        int year = today.getYear();
        int month = today.getMonthValue();

        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);

        Optional<StaffTarget> currentTargetOpt = staffTargetRepository.findByStaff_IdAndYearAndMonth(staff.getId(), year, month);
        Optional<SalaryPaymentEmployee> paymentEmployeeOpt = staff.getStaffId() != null
                ? salaryPaymentEmployeeRepository.findByEmployeeId(staff.getStaffId())
                : Optional.empty();

        BigDecimal baseSalary = staff.getBaseSalary() != null && staff.getBaseSalary().compareTo(BigDecimal.ZERO) > 0
                ? staff.getBaseSalary()
                : paymentEmployeeOpt.map(SalaryPaymentEmployee::getBaseSalary).filter(s -> s.compareTo(BigDecimal.ZERO) > 0)
                .orElse(BigDecimal.ZERO);

        // Commission (same fallback logic as staff)
        BigDecimal currentCommission = computeStaffCommission(staff, principal.getUsername(), startOfMonth, startOfNextMonth, currentTargetOpt);
        
        // Bonuses (same fallback logic as staff)
        BigDecimal currentBonuses = computeStaffBonuses(currentTargetOpt, paymentEmployeeOpt);

        // Gap: No explicit backend calculation for PT session payouts. Returning 0.
        BigDecimal ptSessionsAmount = BigDecimal.ZERO; 
        BigDecimal otherAmount = BigDecimal.ZERO;

        BigDecimal thisMonthTotal = baseSalary.add(currentCommission).add(currentBonuses).add(ptSessionsAmount).add(otherAmount);

        BigDecimal lastMonthTotal = computeLastMonthEarnings(staff, principal.getUsername(), today, baseSalary);

        // Growth Percentage
        int growthPercentage = 0;
        if (lastMonthTotal.compareTo(BigDecimal.ZERO) > 0) {
            double diff = thisMonthTotal.doubleValue() - lastMonthTotal.doubleValue();
            growthPercentage = (int) Math.round((diff / lastMonthTotal.doubleValue()) * 100);
        }

        TrainerEarningsSummaryDTO summary = new TrainerEarningsSummaryDTO(
                thisMonthTotal,
                lastMonthTotal,
                BigDecimal.ZERO, // Assuming all calculated earnings are pending payroll except completed
                thisMonthTotal // Placeholder assuming paid. You can adapt if pending/paid states exist
        );

        // Gap: No authoritative payroll schedule. Falling back to end of month.
        LocalDate nextPayoutDate = today.withDayOfMonth(today.lengthOfMonth());
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(today, nextPayoutDate));
        
        String growthStr = (growthPercentage >= 0 ? "+" : "") + growthPercentage + "%";
        String nextPayoutDateStr = nextPayoutDate.format(DateTimeFormatter.ofPattern("MMM d"));
        String daysRemainingStr = daysRemaining + (daysRemaining == 1 ? " day" : " days");

        TrainerQuickLedgerStatsDTO quickStats = new TrainerQuickLedgerStatsDTO(growthStr, nextPayoutDateStr, daysRemainingStr);

        // Breakdown
        List<TrainerEarningsBreakdownItemDTO> breakdown = computeBreakdown(ptSessionsAmount, currentCommission, currentBonuses, otherAmount, thisMonthTotal);

        // Transactions
        List<TrainerRecentTransactionDTO> recentTransactions = computeRecentEarnings(staff, principal.getUsername(), startOfMonth, startOfNextMonth, currentBonuses);

        // Tax Info
        TrainerTaxInformationDTO taxInfo = computeTaxInfo(staff, principal.getUsername(), today, baseSalary);

        // Gap: No actual tax documents generated for trainers
        List<TrainerTaxDocumentDTO> taxDocuments = Collections.emptyList();

        return new TrainerLedgerResponseDTO(
                summary,
                quickStats,
                breakdown,
                recentTransactions,
                taxInfo,
                taxDocuments
        );
    }

    private BigDecimal computeStaffCommission(
            Staff staff, String username, LocalDateTime start, LocalDateTime end, Optional<StaffTarget> targetOpt) {

        if (targetOpt.isPresent() && targetOpt.get().getCommissionEarned() != null && targetOpt.get().getCommissionEarned().compareTo(BigDecimal.ZERO) > 0) {
            return targetOpt.get().getCommissionEarned();
        }

        Specification<Receipt> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "Paid"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("transactionDate"), start),
                            cb.lessThan(root.get("transactionDate"), end)),
                    cb.and(cb.isNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), start),
                            cb.lessThan(root.get("createdAt"), end))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Receipt> receipts = receiptRepository.findAll(spec);
        BigDecimal revenue = receipts.stream()
                .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal commissionRate = new BigDecimal("0.05"); // Default 5%
        if (staff.getRole() != null) {
            Optional<CommissionRule> ruleOpt = commissionRuleRepository.findByRole(staff.getRole());
            if (ruleOpt.isPresent() && ruleOpt.get().getBaseCommission() != null && ruleOpt.get().getBaseCommission().compareTo(BigDecimal.ZERO) > 0) {
                commissionRate = ruleOpt.get().getBaseCommission().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            }
        }

        BigDecimal calculatedCommission = revenue.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        return calculatedCommission;
    }

    private BigDecimal computeStaffBonuses(Optional<StaffTarget> targetOpt, Optional<SalaryPaymentEmployee> paymentEmployeeOpt) {
        if (targetOpt.isPresent()) {
            StaffTarget target = targetOpt.get();
            if (target.getRevenueAchieved() != null && target.getRevenueTarget() != null
                    && target.getRevenueAchieved().compareTo(target.getRevenueTarget()) >= 0) {
                return new BigDecimal("2000"); // Standard bonus logic derived from target
            }
        }

        if (paymentEmployeeOpt.isPresent() && paymentEmployeeOpt.get().getAllowances() != null
                && paymentEmployeeOpt.get().getAllowances().compareTo(BigDecimal.ZERO) > 0) {
            return paymentEmployeeOpt.get().getAllowances();
        }

        return BigDecimal.ZERO;
    }

    private BigDecimal computeLastMonthEarnings(Staff staff, String username, LocalDate today, BigDecimal baseSalary) {
        LocalDate prevMonthDate = today.minusMonths(1);
        int prevYear = prevMonthDate.getYear();
        int prevMonth = prevMonthDate.getMonthValue();
        
        List<SalaryPayment> payments = salaryPaymentRepository.findAll();
        Optional<SalaryPayment> lastPayment = payments.stream()
                .filter(p -> (p.getEmployeeId() != null && (p.getEmployeeId().equalsIgnoreCase(staff.getStaffId()) || p.getEmployeeId().equals(String.valueOf(staff.getId()))))
                        || (p.getEmployeeName() != null && staff.getName() != null && p.getEmployeeName().equalsIgnoreCase(staff.getName())))
                .filter(p -> p.getYear() != null && p.getYear().equals(prevYear))
                .filter(p -> p.getMonth() != null && (p.getMonth().equalsIgnoreCase(String.valueOf(prevMonth)) || p.getMonth().startsWith(prevMonthDate.getMonth().name().substring(0, 3))))
                .findFirst();

        if (lastPayment.isPresent() && lastPayment.get().getNetSalary() != null && lastPayment.get().getNetSalary().compareTo(BigDecimal.ZERO) > 0) {
            return lastPayment.get().getNetSalary();
        }

        LocalDateTime startOfPrevMonth = prevMonthDate.withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfPrevMonth = startOfPrevMonth.plusMonths(1);
        Optional<StaffTarget> prevTargetOpt = staffTargetRepository.findByStaff_IdAndYearAndMonth(staff.getId(), prevYear, prevMonth);
        BigDecimal prevCommission = computeStaffCommission(staff, username, startOfPrevMonth, endOfPrevMonth, prevTargetOpt);

        return baseSalary.add(prevCommission);
    }

    private List<TrainerEarningsBreakdownItemDTO> computeBreakdown(
            BigDecimal ptSessionsAmount, BigDecimal commission, BigDecimal bonuses, BigDecimal otherAmount, BigDecimal total) {
        
        List<TrainerEarningsBreakdownItemDTO> items = new ArrayList<>();
        double totalVal = total.compareTo(BigDecimal.ZERO) > 0 ? total.doubleValue() : 1.0;

        double ptPct = Math.round((ptSessionsAmount.doubleValue() / totalVal) * 100.0);
        double commPct = Math.round((commission.doubleValue() / totalVal) * 100.0);
        double bonusPct = Math.round((bonuses.doubleValue() / totalVal) * 100.0);
        double otherPct = Math.max(0.0, 100.0 - ptPct - commPct - bonusPct);

        items.add(new TrainerEarningsBreakdownItemDTO("PT Sessions", ptSessionsAmount, (int) ptPct));
        items.add(new TrainerEarningsBreakdownItemDTO("Commission", commission, (int) commPct));
        items.add(new TrainerEarningsBreakdownItemDTO("Bonuses", bonuses, (int) bonusPct));
        items.add(new TrainerEarningsBreakdownItemDTO("Other", otherAmount, (int) otherPct));

        return items;
    }

    private List<TrainerRecentTransactionDTO> computeRecentEarnings(
            Staff staff, String username, LocalDateTime startOfMonth, LocalDateTime startOfNextMonth, BigDecimal bonusAmount) {
        List<TrainerRecentTransactionDTO> list = new ArrayList<>();

        Specification<Receipt> spec = (root, query, cb) -> {
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

        List<Receipt> receipts = receiptRepository.findAll(spec, PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
        for (Receipt r : receipts) {
            String dateStr = r.getTransactionDate() != null
                    ? r.getTransactionDate().toLocalDate().toString()
                    : (r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate().toString() : LocalDate.now().toString());

            String memberName = r.getMemberName() != null ? r.getMemberName() : "Gym Member";
            BigDecimal baseAmount = r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO);
            BigDecimal commAmount = baseAmount.multiply(new BigDecimal("0.05")).setScale(0, RoundingMode.HALF_UP);
            
            if (commAmount.compareTo(BigDecimal.ZERO) > 0) {
                list.add(new TrainerRecentTransactionDTO(
                        "rec-" + r.getId(),
                        dateStr,
                        "Commission - " + (r.getPlanName() != null ? r.getPlanName() : "Membership"),
                        memberName,
                        commAmount,
                        "paid"
                ));
            }
        }

        if (bonusAmount.compareTo(BigDecimal.ZERO) > 0) {
            list.add(new TrainerRecentTransactionDTO(
                    "bonus-" + staff.getId(),
                    LocalDate.now().toString(),
                    "Performance Bonus",
                    "Management",
                    bonusAmount,
                    "paid"
            ));
        }

        list.sort((a, b) -> {
            if (a.getDate() != null && b.getDate() != null) {
                return b.getDate().compareTo(a.getDate());
            }
            return 0;
        });

        return list;
    }

    private TrainerTaxInformationDTO computeTaxInfo(
            Staff staff, String username, LocalDate today, BigDecimal baseSalary) {

        LocalDateTime startOfYear = today.withDayOfYear(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();
        int elapsedMonths = Math.max(1, today.getMonthValue());

        // Derived YTD calculation, not authoritative payroll.
        BigDecimal ytdEarnings = baseSalary.multiply(new BigDecimal(elapsedMonths));

        // Get completed sessions YTD
        int completedSessions = countCompletedSessions(staff.getId(), startOfYear.toLocalDate(), today);
        
        String avgPerSession = "₹0"; // 0 since PT earning calculation is unsupported

        // Gap limitation: activeClients is 0 because schema lacks trainer-client relationship
        int activeClients = 0; 

        return new TrainerTaxInformationDTO(
                "₹" + ytdEarnings.toPlainString(),
                completedSessions,
                avgPerSession,
                activeClients
        );
    }
    
    private int countCompletedSessions(Long trainerId, LocalDate start, LocalDate end) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TrainingSession> sessionRoot = cq.from(TrainingSession.class);

        Predicate trainerPredicate = cb.equal(sessionRoot.get("trainer").get("id"), trainerId);
        Predicate statusPredicate = cb.equal(sessionRoot.get("status"), "completed");
        Predicate datePredicate = cb.between(sessionRoot.get("date"), start, end);

        cq.select(cb.count(sessionRoot)).where(cb.and(trainerPredicate, statusPredicate, datePredicate));
        Long count = entityManager.createQuery(cq).getSingleResult();
        return count != null ? count.intValue() : 0;
    }
}
