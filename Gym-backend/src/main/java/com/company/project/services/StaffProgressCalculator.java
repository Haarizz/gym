package com.company.project.services;

import com.company.project.entities.CommissionRule;
import com.company.project.entities.Lead;
import com.company.project.entities.Receipt;
import com.company.project.entities.Staff;
import com.company.project.repositories.CommissionRuleRepository;
import com.company.project.repositories.LeadRepository;
import com.company.project.repositories.ReceiptRepository;
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

    public StaffProgressCalculator(ReceiptRepository receiptRepository, LeadRepository leadRepository,
                                   CommissionRuleRepository commissionRuleRepository) {
        this.receiptRepository = receiptRepository;
        this.leadRepository = leadRepository;
        this.commissionRuleRepository = commissionRuleRepository;
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
        return computeCommission(staff, username, start, end, computeRevenue(staff, username, start, end));
    }

    /** Same as the 4-arg overload, reusing an already computed total revenue for the range. */
    public BigDecimal computeCommission(Staff staff, String username, LocalDateTime start, LocalDateTime end, BigDecimal totalRevenue) {
        Optional<CommissionRule> rule = findCommissionRule(staff);
        BigDecimal admissionRevenue = computeRevenue(staff, username, start, end, "New");
        BigDecimal otherRevenue = totalRevenue.subtract(admissionRevenue).max(BigDecimal.ZERO);
        return commissionOn(admissionRevenue, admissionCommissionRate(rule))
                .add(commissionOn(otherRevenue, baseCommissionRate(rule)));
    }

    public BigDecimal commissionOn(BigDecimal revenue, BigDecimal ratePercent) {
        return revenue.multiply(ratePercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public BigDecimal computeRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end) {
        return computeRevenue(staff, username, start, end, null);
    }

    /**
     * Same as the 4-arg overload, but optionally restricted to one Receipt.transactionType
     * (e.g. "New" for admissions) — lets commission calculations apply a different rate to
     * new-member admissions than to renewals/add-ons/walk-ins.
     */
    public BigDecimal computeRevenue(Staff staff, String username, LocalDateTime start, LocalDateTime end, String transactionType) {
        Specification<Receipt> spec = (root, query, cb) -> {
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
            if (staff.getName() != null && !staff.getName().isBlank()) {
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

        List<Receipt> receipts = receiptRepository.findAll(spec);
        return receipts.stream()
                .map(StaffProgressCalculator::receivedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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
