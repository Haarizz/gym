package com.company.project.services.mobile.performance;

import com.company.project.dto.mobile.performance.TrainerPerformanceResponseDTO;
import com.company.project.dto.mobile.performance.TrainerPerformanceResponseDTO.*;
import com.company.project.entities.Receipt;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffTarget;
import com.company.project.entities.TrainingSession;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffTargetRepository;
import com.company.project.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class MobileTrainerPerformanceService {

    private final StaffRepository staffRepository;
    private final StaffTargetRepository staffTargetRepository;
    private final ReceiptRepository receiptRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public MobileTrainerPerformanceService(
            StaffRepository staffRepository,
            StaffTargetRepository staffTargetRepository,
            ReceiptRepository receiptRepository) {
        this.staffRepository = staffRepository;
        this.staffTargetRepository = staffTargetRepository;
        this.receiptRepository = receiptRepository;
    }

    public TrainerPerformanceResponseDTO getTrainerPerformance(UserDetailsImpl principal) {
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

        Optional<StaffTarget> targetOpt = staffTargetRepository.findByStaff_IdAndYearAndMonth(staff.getId(), year, month);

        // 1. Monthly Performance - Revenue
        BigDecimal revenueAchieved = computeStaffRevenue(staff, principal.getUsername(), startOfMonth, startOfNextMonth);
        BigDecimal revenueTarget = BigDecimal.ZERO;
        
        if (targetOpt.isPresent() && targetOpt.get().getRevenueTarget() != null && targetOpt.get().getRevenueTarget().compareTo(BigDecimal.ZERO) > 0) {
            revenueTarget = targetOpt.get().getRevenueTarget();
            if (targetOpt.get().getRevenueAchieved() != null && targetOpt.get().getRevenueAchieved().compareTo(revenueAchieved) > 0) {
                revenueAchieved = targetOpt.get().getRevenueAchieved();
            }
        } else if (staff.getMonthlyTarget() != null && staff.getMonthlyTarget().compareTo(BigDecimal.ZERO) > 0) {
            revenueTarget = staff.getMonthlyTarget();
        }

        int revenuePercentage = 0;
        if (revenueTarget.compareTo(BigDecimal.ZERO) > 0) {
            revenuePercentage = (int) Math.round((revenueAchieved.doubleValue() / revenueTarget.doubleValue()) * 100);
        }
        RevenuePerformanceDTO revenuePerformance = new RevenuePerformanceDTO(revenueAchieved, revenueTarget, revenuePercentage);

        // 2. Monthly Performance - Sessions
        int sessionsCompleted = countCompletedSessions(staff.getId(), startOfMonth.toLocalDate(), startOfNextMonth.toLocalDate().minusDays(1));
        int sessionsTarget = 0;

        if (targetOpt.isPresent() && targetOpt.get().getSessionsTarget() != null) {
            sessionsTarget = targetOpt.get().getSessionsTarget();
        }

        double sessionsPercentage = 0;
        if (sessionsTarget > 0) {
            sessionsPercentage = Math.round(((double) sessionsCompleted / sessionsTarget) * 1000.0) / 10.0;
        }
        SessionPerformanceDTO sessionPerformance = new SessionPerformanceDTO(sessionsCompleted, sessionsTarget, sessionsPercentage);

        MonthlyPerformanceDTO monthlyPerformance = new MonthlyPerformanceDTO(revenuePerformance, sessionPerformance);

        // 3. Active Clients
        // Current schema limitation: No explicit trainer-client assignment relationship.
        ActiveClientsDTO activeClients = new ActiveClientsDTO(0, 0);

        // 4. Six-Month Trend
        List<TrainerSessionTrendDTO> sixMonthTrend = computeSixMonthSessionTrend(staff.getId(), today);

        // 5. Performance Tip
        int sessionsRemaining = Math.max(sessionsTarget - sessionsCompleted, 0);
        double remainingPercentage = 0;
        if (sessionsTarget > 0) {
            remainingPercentage = Math.round(((double) sessionsRemaining / sessionsTarget) * 1000.0) / 10.0;
        }
        PerformanceTipDTO performanceTip = new PerformanceTipDTO(remainingPercentage, sessionsRemaining);

        return new TrainerPerformanceResponseDTO(
                monthlyPerformance,
                activeClients,
                sixMonthTrend,
                performanceTip
        );
    }

    private BigDecimal computeStaffRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
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
        return receipts.stream()
                .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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

    private List<TrainerSessionTrendDTO> computeSixMonthSessionTrend(Long trainerId, LocalDate today) {
        List<TrainerSessionTrendDTO> trends = new ArrayList<>();

        LocalDate sixMonthsAgo = today.minusMonths(5).withDayOfMonth(1);
        LocalDate endOfCurrentMonth = today.withDayOfMonth(today.lengthOfMonth());

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<TrainingSession> cq = cb.createQuery(TrainingSession.class);
        Root<TrainingSession> sessionRoot = cq.from(TrainingSession.class);

        Predicate trainerPredicate = cb.equal(sessionRoot.get("trainer").get("id"), trainerId);
        Predicate statusPredicate = cb.equal(sessionRoot.get("status"), "completed");
        Predicate datePredicate = cb.between(sessionRoot.get("date"), sixMonthsAgo, endOfCurrentMonth);

        cq.select(sessionRoot).where(cb.and(trainerPredicate, statusPredicate, datePredicate));
        List<TrainingSession> sessions = entityManager.createQuery(cq).getResultList();

        for (int i = 5; i >= 0; i--) {
            LocalDate monthDate = today.minusMonths(i);
            String periodStr = monthDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            
            int monthValue = monthDate.getMonthValue();
            int yearValue = monthDate.getYear();
            
            long sessionCount = sessions.stream()
                    .filter(s -> s.getDate().getYear() == yearValue && s.getDate().getMonthValue() == monthValue)
                    .count();
                    
            trends.add(new TrainerSessionTrendDTO(periodStr, (int) sessionCount));
        }

        return trends;
    }
}
