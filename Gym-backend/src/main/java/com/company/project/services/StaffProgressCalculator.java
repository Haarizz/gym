package com.company.project.services;

import com.company.project.entities.Lead;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.Staff;
import com.company.project.repositories.AddonPlanRepository;
import com.company.project.repositories.LeadRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SaleTransactionItemRepository;
import com.company.project.repositories.SaleTransactionRepository;
import com.company.project.repositories.TrainingSessionRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * The pre-engine way of computing a staff member's sales for a date range, matching people by
 * name. Commission and target logic now live in the performance engine
 * (com.company.project.performance); what is left here backs the engine's parity check and a
 * few POS/receipt helpers, and goes away with the old tables (plan §8 Phase 6).
 */
@Service
@Transactional(readOnly = true)
public class StaffProgressCalculator {

    /**
     * Receipt statuses that carry money actually received: fully paid, or a part-payment.
     * A part-paid sale counts its paid portion straight away. Later instalments arrive as their
     * own "Paid" settlement receipts while the original keeps its first paidAmount (only flipping
     * to "Paid" once settled), so nothing is counted twice.
     */
    public static final List<String> REVENUE_RECEIPT_STATUSES = List.of("Paid", "Partial");

    /** Money actually received on a receipt — the paid portion of a part-payment, never its full price. */
    public static BigDecimal receivedAmount(Receipt r) {
        if (r.getPaidAmount() != null) return r.getPaidAmount();
        // Legacy rows without paidAmount: only a fully paid receipt can be assumed to be its amount.
        return "Paid".equals(r.getStatus()) && r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO;
    }

    private final ReceiptRepository receiptRepository;
    private final LeadRepository leadRepository;
    private final SaleTransactionRepository saleTransactionRepository;
    private final SaleTransactionItemRepository saleTransactionItemRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final MemberAddonRepository memberAddonRepository;
    private final AddonPlanRepository addonPlanRepository;

    public StaffProgressCalculator(ReceiptRepository receiptRepository, LeadRepository leadRepository,
                                   SaleTransactionRepository saleTransactionRepository,
                                   SaleTransactionItemRepository saleTransactionItemRepository,
                                   TrainingSessionRepository trainingSessionRepository,
                                   MemberAddonRepository memberAddonRepository,
                                   AddonPlanRepository addonPlanRepository) {
        this.receiptRepository = receiptRepository;
        this.leadRepository = leadRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.saleTransactionItemRepository = saleTransactionItemRepository;
        this.trainingSessionRepository = trainingSessionRepository;
        this.memberAddonRepository = memberAddonRepository;
        this.addonPlanRepository = addonPlanRepository;
    }

    /** Completed POS sales rung up by this login in the range, newest first. */
    public List<SaleTransaction> posSales(String username, LocalDateTime start, LocalDateTime end) {
        return completedSales(username, start, end);
    }

    /** Completed POS sales in the range, by one cashier login or (null) by everyone. */
    private List<SaleTransaction> completedSales(String cashierOrAll, LocalDateTime start, LocalDateTime end) {
        Specification<SaleTransaction> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (cashierOrAll != null) predicates.add(cb.equal(root.get("createdBy"), cashierOrAll));
            predicates.add(cb.equal(root.get("status"), "COMPLETED"));
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
            predicates.add(cb.lessThan(root.get("createdAt"), end));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return saleTransactionRepository.findAll(spec, org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
    }

    // ── Whole gym (institution-wide targets) ─────────────────────────────────

    /**
     * Revenue toward an institution-wide target: every membership payment received plus every
     * completed POS sale (net of refunds) in the range, whoever took it — including the owner
     * and sales with no staff attached. Scoped to the active branch by the branch filter.
     */
    public BigDecimal computeGymRevenue(LocalDateTime start, LocalDateTime end) {
        BigDecimal membership = receiptRepository.findAll(receiptSpec(null, null, start, end, null)).stream()
                .map(StaffProgressCalculator::receivedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pos = completedSales(null, start, end).stream()
                .map(StaffProgressCalculator::posNet)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return membership.add(pos);
    }

    /** Units across the whole gym in the range (same unit types as computeUnits). */
    public java.util.Map<String, Integer> computeGymUnits(LocalDateTime start, LocalDateTime end) {
        return countUnits(null, null, true, start, end);
    }

    /**
     * Revenue toward the staff member's target: membership payments they took plus POS sales
     * they rang up (net of refunds). Both ways of selling fill the same target.
     */
    public BigDecimal computeRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return computeRevenueBreakdown(staff, username, start, end).total();
    }

    /** Money received on membership receipts (admissions, renewals, add-ons, walk-ins) only. */
    public BigDecimal computeMembershipRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return computeRevenue(staff, username, start, end, null);
    }

    /** Net (after refunds) value of the completed POS sales this login rang up in the range. */
    public BigDecimal computePosRevenue(String username, LocalDateTime start, LocalDateTime end) {
        if (username == null || username.isBlank()) return BigDecimal.ZERO;
        return posSales(username, start, end).stream()
                .map(StaffProgressCalculator::posNet)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal posNet(SaleTransaction sale) {
        BigDecimal total = sale.getTotalAmount() != null ? sale.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal refunded = sale.getRefundedAmount() != null ? sale.getRefundedAmount() : BigDecimal.ZERO;
        return total.subtract(refunded).max(BigDecimal.ZERO);
    }

    /**
     * Membership receipts only, optionally restricted to one Receipt.transactionType
     * (e.g. "New" for admissions) — lets commission calculations apply a different rate to
     * new-member admissions than to renewals/add-ons/walk-ins.
     */
    public BigDecimal computeRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end, String transactionType) {
        List<Receipt> receipts = receiptRepository.findAll(receiptSpec(staff, username, start, end, transactionType));
        return receipts.stream()
                .map(StaffProgressCalculator::receivedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Revenue by category (Set Targets › membership / POS / PT revenue targets) ──

    /**
     * Revenue split by sales category. memberships = membership receipts that aren't personal
     * training (admissions, renewals, other add-ons, walk-ins); pos = completed POS sales net of
     * refunds; pt = receipts paying for personal training. The three add up to computeRevenue.
     */
    public record RevenueBreakdown(BigDecimal memberships, BigDecimal pos, BigDecimal pt) {
        public BigDecimal total() { return memberships.add(pos).add(pt); }
    }

    /**
     * The staff member's revenue by category: receipts they took, plus payments for bookings on
     * PT sessions they train. Members book PT in the app, where the receipt is processed by
     * "Mobile App" — the trainer of the booked session is who it counts for.
     */
    public RevenueBreakdown computeRevenueBreakdown(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return breakdown(staffReceipts(staff, username, start, end), computePosRevenue(username, start, end));
    }

    private List<Receipt> staffReceipts(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        List<Receipt> taken = receiptRepository.findAll(receiptSpec(staff, username, start, end, null));
        if (staff == null || staff.getId() == null) return taken;
        List<Long> trained = trainingSessionRepository.findPtBookingReceiptIdsByTrainer(staff.getId());
        if (trained.isEmpty()) return taken;
        java.util.Set<Long> seen = new java.util.HashSet<>();
        taken.forEach(r -> seen.add(r.getId()));
        Specification<Receipt> trainerSpec = receiptSpec(null, null, start, end, null)
                .and((root, query, cb) -> root.get("id").in(trained));
        List<Receipt> out = new ArrayList<>(taken);
        for (Receipt r : receiptRepository.findAll(trainerSpec)) {
            if (seen.add(r.getId())) out.add(r);
        }
        return out;
    }

    /** Whole-gym revenue by category (institution-wide targets). */
    public RevenueBreakdown computeGymRevenueBreakdown(LocalDateTime start, LocalDateTime end) {
        BigDecimal pos = completedSales(null, start, end).stream()
                .map(StaffProgressCalculator::posNet)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return breakdown(receiptRepository.findAll(receiptSpec(null, null, start, end, null)), pos);
    }

    /** Money received on PT in the range: PT they sold plus bookings on PT sessions they train. */
    public BigDecimal computePtRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return breakdown(staffReceipts(staff, username, start, end), BigDecimal.ZERO).pt();
    }

    private RevenueBreakdown breakdown(List<Receipt> receipts, BigDecimal pos) {
        java.util.Set<Long> ptIds = ptReceiptIds(receipts);
        BigDecimal memberships = BigDecimal.ZERO;
        BigDecimal pt = BigDecimal.ZERO;
        for (Receipt r : receipts) {
            BigDecimal received = receivedAmount(r);
            if (r.getId() != null && ptIds.contains(r.getId())) pt = pt.add(received);
            else memberships = memberships.add(received);
        }
        return new RevenueBreakdown(memberships, pos, pt);
    }

    private static final java.util.regex.Pattern PT_NAME =
            java.util.regex.Pattern.compile("(?i)(personal\\s*training|\\bpt\\b)");

    /**
     * Receipts that pay for personal training: the plan name reads as PT ("Personal Training",
     * "PT - 10 sessions"), it names a PT add-on plan, or the add-on bought on it is in the
     * "Personal Training"/"Training" category, or it paid for a booking on a PT session (the
     * app's "Class Booking" receipts are named after the session, which needn't say PT).
     * Instalment receipts carry the plan name too.
     */
    private java.util.Set<Long> ptReceiptIds(List<Receipt> receipts) {
        java.util.Set<Long> out = new java.util.HashSet<>();
        if (receipts.isEmpty()) return out;
        java.util.Set<String> ptPlanNames = new java.util.HashSet<>(addonPlanRepository.findPtPlanNamesLower());
        List<Long> addonReceipts = new ArrayList<>();
        List<Long> bookingReceipts = new ArrayList<>();
        for (Receipt r : receipts) {
            if (r.getId() == null) continue;
            String name = r.getPlanName();
            if (name != null && (PT_NAME.matcher(name).find() || ptPlanNames.contains(name.trim().toLowerCase()))) {
                out.add(r.getId());
            } else if ("Add-on".equals(r.getTransactionType())) {
                addonReceipts.add(r.getId());
            } else if (ReceiptService.TXN_CLASS_BOOKING.equals(r.getTransactionType())) {
                bookingReceipts.add(r.getId());
            }
        }
        if (!addonReceipts.isEmpty()) out.addAll(memberAddonRepository.findPtReceiptIds(addonReceipts));
        if (!bookingReceipts.isEmpty()) out.addAll(trainingSessionRepository.findPtBookingReceiptIds(bookingReceipts));
        return out;
    }

    /** Unit types a target can count (Set Targets › unit targets), keyed as stored in unit_targets_json. */
    public static final List<String> UNIT_TYPES =
            List.of("admissions", "renewals", "addons", "walkins", "pos_sales", "pos_items", "pt_sessions");

    /** Receipt.transactionType behind each membership unit type. */
    private static final java.util.Map<String, String> RECEIPT_UNIT_TYPES = java.util.Map.of(
            "New", "admissions", "Renewal", "renewals", "Add-on", "addons", "Daily Entry", "walkins");

    /**
     * Units the staff member sold in the range, by unit type: membership receipts they took
     * (admissions, renewals, add-ons, walk-ins; instalment "Payment" receipts aren't new units)
     * POS sales they rang up (completed sales, and the items on them), and PT sessions they
     * delivered as the trainer (not cancelled, and dated today or earlier: a session booked for
     * later this month counts once its day arrives).
     */
    public java.util.Map<String, Integer> computeUnits(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return countUnits(staff, username, false, start, end);
    }

    private java.util.Map<String, Integer> countUnits(Staff staff, String username, boolean wholeGym,
                                                      LocalDateTime start, LocalDateTime end) {
        java.util.Map<String, Integer> units = new java.util.LinkedHashMap<>();
        UNIT_TYPES.forEach(type -> units.put(type, 0));
        for (Receipt r : receiptRepository.findAll(receiptSpec(staff, username, start, end, null))) {
            String type = RECEIPT_UNIT_TYPES.get(r.getTransactionType());
            if (type != null) units.merge(type, 1, Integer::sum);
        }
        if (wholeGym || (username != null && !username.isBlank())) {
            List<SaleTransaction> sales = completedSales(wholeGym ? null : username, start, end);
            units.put("pos_sales", sales.size());
            if (!sales.isEmpty()) {
                int items = saleTransactionItemRepository
                        .findByTransactionIdIn(sales.stream().map(SaleTransaction::getId).toList())
                        .stream()
                        .mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 0)
                        .sum();
                units.put("pos_items", items);
            }
        }
        if (wholeGym || (staff != null && staff.getId() != null)) {
            java.time.LocalDate from = start.toLocalDate();
            java.time.LocalDate lastDay = end.toLocalDate().minusDays(1);
            java.time.LocalDate today = java.time.LocalDate.now();
            java.time.LocalDate to = lastDay.isAfter(today) ? today : lastDay;
            if (!to.isBefore(from)) {
                int pt = wholeGym
                        ? (int) trainingSessionRepository.countBookedPtSessionsBetween(from, to)
                        : trainingSessionRepository
                                .countBookedPtSessionsByTrainerBetween(List.of(staff.getId()), from, to).stream()
                                .mapToInt(row -> ((Number) row[1]).intValue())
                                .sum();
                units.put("pt_sessions", pt);
            }
        }
        return units;
    }

    /**
     * A mobile Cash/Credit/Mixed payment keeps status Paid/Partial while reception hasn't
     * approved it yet (approvalStatus PENDING) and after they reject it (REJECTED) — neither
     * is money received, so neither counts until approved.
     */
    private static Predicate notAwaitingOrRejected(jakarta.persistence.criteria.Root<Receipt> root,
                                                   jakarta.persistence.criteria.CriteriaBuilder cb) {
        return cb.or(cb.isNull(root.get("approvalStatus")),
                cb.not(cb.upper(root.get("approvalStatus")).in("PENDING", "REJECTED")));
    }

    private Specification<Receipt> receiptSpec(Staff staff, String username, LocalDateTime start, LocalDateTime end,
                                               String transactionType) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(root.get("status").in(REVENUE_RECEIPT_STATUSES));
            predicates.add(notAwaitingOrRejected(root, cb));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("transactionDate"), start),
                            cb.lessThan(root.get("transactionDate"), end)),
                    cb.and(cb.isNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), start),
                            cb.lessThan(root.get("createdAt"), end))
            ));
            Predicate person = personFilter(root, cb, staff, username, "processedBy");
            if (person != null) {
                predicates.add(person);
            }
            if (transactionType != null) {
                predicates.add(cb.equal(root.get("transactionType"), transactionType));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Whose activity a receipt / lead / follow-up query counts. A staff member matches by name in
     * {@code staffField} (processedBy / assignedStaff) or by the login that created the row; an
     * account with no Staff record (Admin, gym owner) — or a staff row without a name — matches
     * only rows its own login created. No staff and no username means gym-wide (returns null).
     */
    public static Predicate personFilter(jakarta.persistence.criteria.Root<?> root,
                                         jakarta.persistence.criteria.CriteriaBuilder cb,
                                         Staff staff, String username, String staffField) {
        boolean hasName = staff != null && staff.getName() != null && !staff.getName().isBlank();
        if (hasName) {
            return cb.or(
                    cb.like(cb.lower(root.get(staffField)), "%" + staff.getName().toLowerCase() + "%"),
                    cb.equal(root.get("createdBy"), username)
            );
        }
        return username != null && !username.isBlank() ? cb.equal(root.get("createdBy"), username) : null;
    }
}
