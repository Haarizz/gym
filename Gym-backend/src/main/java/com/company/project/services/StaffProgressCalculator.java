package com.company.project.services;

import com.company.project.entities.Lead;
import com.company.project.entities.Receipt;
import com.company.project.entities.Staff;
import com.company.project.repositories.LeadRepository;
import com.company.project.repositories.ReceiptRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Computes a staff member's actual revenue and conversions for a date range from real
 * sales/lead data. Shared by the mobile performance dashboard and the web staff-targets
 * feature so both surfaces derive "achieved" progress from the same source of truth.
 */
@Service
@Transactional(readOnly = true)
public class StaffProgressCalculator {

    private final ReceiptRepository receiptRepository;
    private final LeadRepository leadRepository;

    public StaffProgressCalculator(ReceiptRepository receiptRepository, LeadRepository leadRepository) {
        this.receiptRepository = receiptRepository;
        this.leadRepository = leadRepository;
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
            if (transactionType != null) {
                predicates.add(cb.equal(root.get("transactionType"), transactionType));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Receipt> receipts = receiptRepository.findAll(spec);
        return receipts.stream()
                .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
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
}
