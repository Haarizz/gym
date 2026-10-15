package com.company.project.services;

import com.company.project.entities.CommissionRule;
import com.company.project.entities.Lead;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.Staff;
import com.company.project.repositories.CommissionRuleRepository;
import com.company.project.repositories.LeadRepository;
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
 * Computes a staff member's actual revenue and conversions for a date range from real
 * sales/lead data. Shared by the mobile performance dashboard and the web staff-targets
 * feature so both surfaces derive "achieved" progress from the same source of truth.
 */
@Service
@Transactional(readOnly = true)
public class StaffProgressCalculator {

    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("5");

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
    private final CommissionRuleRepository commissionRuleRepository;
    private final SaleTransactionRepository saleTransactionRepository;
    private final SaleTransactionItemRepository saleTransactionItemRepository;
    private final TrainingSessionRepository trainingSessionRepository;

    public StaffProgressCalculator(ReceiptRepository receiptRepository, LeadRepository leadRepository,
                                   CommissionRuleRepository commissionRuleRepository,
                                   SaleTransactionRepository saleTransactionRepository,
                                   SaleTransactionItemRepository saleTransactionItemRepository,
                                   TrainingSessionRepository trainingSessionRepository) {
        this.receiptRepository = receiptRepository;
        this.leadRepository = leadRepository;
        this.commissionRuleRepository = commissionRuleRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.saleTransactionItemRepository = saleTransactionItemRepository;
        this.trainingSessionRepository = trainingSessionRepository;
    }

    /** The commission rule configured for the staff member's role, if any. */
    public Optional<CommissionRule> findCommissionRule(Staff staff) {
        return staff.getRole() != null
                ? commissionRuleRepository.findByRoleIgnoreCase(staff.getRole())
                : Optional.empty();
    }

    /** Percentage applied to renewals, add-ons and walk-ins; 5% when the role has no rule. */
    public BigDecimal baseCommissionRate(Optional<CommissionRule> rule) {
        return rule.map(CommissionRule::getBaseCommission).orElse(DEFAULT_COMMISSION_RATE);
    }

    /** Percentage applied to new-member admissions; falls back to the base rate. */
    public BigDecimal admissionCommissionRate(Optional<CommissionRule> rule) {
        return rule.map(CommissionRule::getAdmissionCommission).orElse(baseCommissionRate(rule));
    }

    /**
     * Commission earned from the staff member's paid sales in the range. Admission (new-member)
     * revenue is commissioned at the role's admissionCommission rate; everything else (renewals,
     * add-ons, walk-ins) at baseCommission. Falls back to a flat 5% when the staff's role has no
     * configured CommissionRule.
     */
    public BigDecimal computeCommission(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        // Membership payments only: POS sales are commissioned at the POS rates below, never
        // also at the base rate, even though both count toward the revenue target.
        Optional<CommissionRule> rule = findCommissionRule(staff);
        BigDecimal membershipRevenue = computeMembershipRevenue(staff, username, start, end);
        BigDecimal admissionRevenue = computeRevenue(staff, username, start, end, "New");
        BigDecimal otherRevenue = membershipRevenue.subtract(admissionRevenue).max(BigDecimal.ZERO);
        return commissionOn(admissionRevenue, admissionCommissionRate(rule))
                .add(commissionOn(otherRevenue, baseCommissionRate(rule)))
                .add(computePosCommission(rule, username, start, end));
    }

    /**
     * Commission on POS sales the staff member rang up (sale_transactions.created_by is the
     * cashier's login): the role's posCommission % of each completed sale's net amount (total
     * minus refunds) plus its posCommissionPerSale for every completed sale. Fully refunded
     * and voided sales earn nothing. Zero when the role has no POS rates.
     */
    public BigDecimal computePosCommission(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return computePosCommission(findCommissionRule(staff), username, start, end);
    }

    private BigDecimal computePosCommission(Optional<CommissionRule> rule, String username,
                                            LocalDateTime start, LocalDateTime end) {
        if (!hasPosRates(rule) || username == null || username.isBlank()) return BigDecimal.ZERO;
        return posSales(username, start, end).stream()
                .map(sale -> posCommissionOn(sale, rule))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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

    public boolean hasPosRates(Optional<CommissionRule> rule) {
        return rule.map(r -> positive(r.getPosCommission()) || positive(r.getPosCommissionPerSale())).orElse(false);
    }

    /** One sale's POS commission: % of its net amount plus the fixed per-sale amount. */
    public BigDecimal posCommissionOn(SaleTransaction sale, Optional<CommissionRule> rule) {
        if (rule.isEmpty()) return BigDecimal.ZERO;
        BigDecimal net = posNet(sale);
        BigDecimal commission = positive(rule.get().getPosCommission())
                ? commissionOn(net, rule.get().getPosCommission())
                : BigDecimal.ZERO;
        if (positive(rule.get().getPosCommissionPerSale())) {
            commission = commission.add(rule.get().getPosCommissionPerSale());
        }
        return commission;
    }

    private static boolean positive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }

    public BigDecimal commissionOn(BigDecimal revenue, BigDecimal ratePercent) {
        return revenue.multiply(ratePercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    /**
     * Revenue toward the staff member's target: membership payments they took plus POS sales
     * they rang up (net of refunds). Both ways of selling fill the same target.
     */
    public BigDecimal computeRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return computeMembershipRevenue(staff, username, start, end).add(computePosRevenue(username, start, end));
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
        if (wholeGym || staff.getId() != null) {
            java.time.LocalDate from = start.toLocalDate();
            java.time.LocalDate lastDay = end.toLocalDate().minusDays(1);
            java.time.LocalDate today = java.time.LocalDate.now();
            java.time.LocalDate to = lastDay.isAfter(today) ? today : lastDay;
            if (!to.isBefore(from)) {
                int pt = wholeGym
                        ? (int) trainingSessionRepository.countPtSessionsBetween(from, to)
                        : trainingSessionRepository
                                .countPtSessionsByTrainerBetween(List.of(staff.getId()), from, to).stream()
                                .mapToInt(row -> ((Number) row[1]).intValue())
                                .sum();
                units.put("pt_sessions", pt);
            }
        }
        return units;
    }

    private Specification<Receipt> receiptSpec(Staff staff, String username, LocalDateTime start, LocalDateTime end,
                                               String transactionType) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(root.get("status").in(REVENUE_RECEIPT_STATUSES));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("transactionDate"), start),
                            cb.lessThan(root.get("transactionDate"), end)),
                    cb.and(cb.isNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), start),
                            cb.lessThan(root.get("createdAt"), end))
            ));
            if (staff != null && staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            if (transactionType != null) {
                predicates.add(cb.equal(root.get("transactionType"), transactionType));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public int computeConversions(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        Specification<Lead> leadConvertedSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "converted"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("lastContactDate")),
                            cb.greaterThanOrEqualTo(root.get("lastContactDate"), start),
                            cb.lessThan(root.get("lastContactDate"), end)),
                    cb.and(cb.isNull(root.get("lastContactDate")),
                            cb.greaterThanOrEqualTo(root.get("updatedAt"), start),
                            cb.lessThan(root.get("updatedAt"), end))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        int leadConversions = (int) leadRepository.count(leadConvertedSpec);

        Specification<Receipt> receiptSpec = (root, query, cb) -> {
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
        int paidReceipts = (int) receiptRepository.count(receiptSpec);

        return Math.max(leadConversions, paidReceipts);
    }

    /**
     * Share (0–100) of the staff member's leads — assigned to them or created by them — that
     * are converted. A null staff counts every lead, matching accounts with no Staff record.
     */
    public int computeLeadConversionRate(Staff staff, String username) {
        long totalLeads = leadRepository.count(staffLeadsSpec(staff, username, false));
        if (totalLeads == 0) return 0;
        long convertedLeads = leadRepository.count(staffLeadsSpec(staff, username, true));
        return (int) Math.round(((double) convertedLeads / totalLeads) * 100);
    }

    private Specification<Lead> staffLeadsSpec(Staff staff, String username, boolean convertedOnly) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (convertedOnly) {
                predicates.add(cb.equal(root.get("status"), "converted"));
            }
            if (staff != null && staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
