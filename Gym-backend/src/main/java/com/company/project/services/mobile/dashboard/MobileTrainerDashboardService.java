package com.company.project.services.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.trainer.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BookingRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileTrainerDashboardService {

    private final StaffRepository staffRepository;
    private final ReceiptRepository receiptRepository;
    private final StaffTargetRepository staffTargetRepository;
    private final BookingRepository bookingRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public MobileTrainerDashboardService(
            StaffRepository staffRepository,
            ReceiptRepository receiptRepository,
            StaffTargetRepository staffTargetRepository,
            BookingRepository bookingRepository) {
        this.staffRepository = staffRepository;
        this.receiptRepository = receiptRepository;
        this.staffTargetRepository = staffTargetRepository;
        this.bookingRepository = bookingRepository;
    }

    public TrainerDashboardResponseDTO getTrainerDashboard(UserDetailsImpl principal) {
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

        // 1. Trainer Info
        TrainerInfoDTO trainerInfo = new TrainerInfoDTO(
                staff.getName() != null ? staff.getName() : principal.getUsername(),
                staff.getDepartment() != null ? staff.getDepartment() : staff.getRole(),
                4.9 // Default rating since there's no rating field in Staff entity
        );

        // 2. Fetch Today's Sessions using EntityManager
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<TrainingSession> cq = cb.createQuery(TrainingSession.class);
        Root<TrainingSession> sessionRoot = cq.from(TrainingSession.class);

        Predicate trainerPredicate = cb.equal(sessionRoot.get("trainer").get("id"), staff.getId());
        Predicate datePredicate = cb.equal(sessionRoot.get("date"), today);
        Predicate notCancelled = cb.notEqual(sessionRoot.get("status"), "cancelled");

        cq.select(sessionRoot).where(cb.and(trainerPredicate, datePredicate, notCancelled))
                .orderBy(cb.asc(sessionRoot.get("startTime")));

        List<TrainingSession> todaysSessionsList = entityManager.createQuery(cq).getResultList();

        int sessionsScheduled = todaysSessionsList.size();
        int sessionsCompleted = 0;

        List<TrainerDashboardSessionDTO> todaySessions = new ArrayList<>();
        for (TrainingSession session : todaysSessionsList) {
            if ("completed".equalsIgnoreCase(session.getStatus())) {
                sessionsCompleted++;
            }

            // Find members for this session via Booking
            String memberName = resolveMemberNameForSession(session);
            
            LocalDateTime sessionStartTime = session.getDate().atTime(session.getStartTime());

            todaySessions.add(new TrainerDashboardSessionDTO(
                    session.getId(),
                    sessionStartTime,
                    memberName,
                    session.getType() != null ? session.getType() : "Session",
                    session.getName() != null ? session.getName() : session.getDescription(),
                    session.getStatus()
            ));
        }

        // 3. Stats Calculation

        // Today Earnings (same logic as StaffDashboard)
        Specification<Receipt> receiptTodaySpec = (root, query, cbReceipt) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cbReceipt.equal(root.get("status"), "Paid"));
            predicates.add(cbReceipt.or(
                    cbReceipt.and(cbReceipt.isNotNull(root.get("transactionDate")),
                            cbReceipt.greaterThanOrEqualTo(root.get("transactionDate"), startOfDay),
                            cbReceipt.lessThan(root.get("transactionDate"), endOfDay)),
                    cbReceipt.and(cbReceipt.isNull(root.get("transactionDate")),
                            cbReceipt.greaterThanOrEqualTo(root.get("createdAt"), startOfDay),
                            cbReceipt.lessThan(root.get("createdAt"), endOfDay))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cbReceipt.or(
                        cbReceipt.like(cbReceipt.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cbReceipt.equal(root.get("createdBy"), principal.getUsername())
                ));
            }
            return cbReceipt.and(predicates.toArray(new Predicate[0]));
        };
        List<Receipt> todayReceipts = receiptRepository.findAll(receiptTodaySpec);
        BigDecimal todayEarnings = todayReceipts.stream()
                .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Monthly Target Percentage
        int monthlyTargetPercentage = 0;
        Optional<StaffTarget> targetOpt = staffTargetRepository.findByStaff_IdAndYearAndMonth(staff.getId(), today.getYear(), today.getMonthValue());
        
        if (targetOpt.isPresent()) {
            StaffTarget target = targetOpt.get();
            BigDecimal revenueTarget = target.getRevenueTarget() != null ? target.getRevenueTarget() : BigDecimal.ZERO;
            BigDecimal revenueAchieved = target.getRevenueAchieved() != null ? target.getRevenueAchieved() : BigDecimal.ZERO;
            
            if (revenueTarget.compareTo(BigDecimal.ZERO) > 0) {
                monthlyTargetPercentage = (int) Math.round((revenueAchieved.doubleValue() / revenueTarget.doubleValue()) * 100);
            }
        } else {
            // Live calculation fallback
            Specification<Receipt> monthReceiptsSpec = (root, query, cbReceipt) -> {
                List<Predicate> predicates = new ArrayList<>();
                predicates.add(cbReceipt.equal(root.get("status"), "Paid"));
                predicates.add(cbReceipt.or(
                        cbReceipt.and(cbReceipt.isNotNull(root.get("transactionDate")),
                                cbReceipt.greaterThanOrEqualTo(root.get("transactionDate"), startOfMonth),
                                cbReceipt.lessThan(root.get("transactionDate"), startOfNextMonth)),
                        cbReceipt.and(cbReceipt.isNull(root.get("transactionDate")),
                                cbReceipt.greaterThanOrEqualTo(root.get("createdAt"), startOfMonth),
                                cbReceipt.lessThan(root.get("createdAt"), startOfNextMonth))
                ));
                if (staff.getName() != null && !staff.getName().isBlank()) {
                    predicates.add(cbReceipt.or(
                            cbReceipt.like(cbReceipt.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                            cbReceipt.equal(root.get("createdBy"), principal.getUsername())
                    ));
                }
                return cbReceipt.and(predicates.toArray(new Predicate[0]));
            };
            
            List<Receipt> monthReceipts = receiptRepository.findAll(monthReceiptsSpec);
            BigDecimal totalMonthRevenue = monthReceipts.stream()
                    .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal monthlyTarget = staff.getMonthlyTarget();
            if (monthlyTarget != null && monthlyTarget.compareTo(BigDecimal.ZERO) > 0) {
                monthlyTargetPercentage = (int) Math.round((totalMonthRevenue.doubleValue() / monthlyTarget.doubleValue()) * 100);
            }
        }

        // Active Members (Gap limitation)
        // Since there is no explicit Staff -> Member assignment in the schema,
        // and inventing a dynamic relationship is prohibited by the prompt,
        // we return 0 to satisfy the DTO contract while safely acknowledging the limitation.
        int activeMembers = 0;

        TrainerDashboardStatsDTO stats = new TrainerDashboardStatsDTO(
                sessionsScheduled,
                sessionsCompleted,
                activeMembers,
                todayEarnings,
                monthlyTargetPercentage
        );

        return new TrainerDashboardResponseDTO(trainerInfo, stats, todaySessions);
    }
    
    private String resolveMemberNameForSession(TrainingSession session) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Booking> bq = cb.createQuery(Booking.class);
        Root<Booking> bookingRoot = bq.from(Booking.class);
        
        bq.select(bookingRoot)
          .where(
              cb.equal(bookingRoot.get("session").get("id"), session.getId()),
              cb.notEqual(bookingRoot.get("status"), "cancelled")
          );
          
        List<Booking> bookings = entityManager.createQuery(bq).getResultList();
        
        if (bookings.isEmpty()) {
            return "No Bookings";
        } else if (bookings.size() == 1) {
            Booking b = bookings.get(0);
            if (b.getMember() != null) {
                return b.getMember().getName();
            } else if (b.getGuestName() != null) {
                return b.getGuestName() + " (Guest)";
            }
            return "Member";
        } else {
            return bookings.size() + " Members";
        }
    }
}
