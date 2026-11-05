package com.company.project.performance.events;

import com.company.project.performance.attribution.StaffAttribution;
import com.company.project.performance.metric.Metric;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Membership receipts. MEMBER_ADMISSION: a "New" receipt with money received — fully paid or
 * part-paid (its paid portion), and for a mobile Cash/Credit/Mixed payment only once reception
 * has approved it. Credited to the staff member who processed it.
 */
@Component
public class ReceiptDeriver implements SourceDeriver {

    static final List<String> REVENUE_STATUSES = List.of("Paid", "Partial");

    @PersistenceContext
    private EntityManager em;

    private final StaffAttribution attribution;

    public ReceiptDeriver(StaffAttribution attribution) {
        this.attribution = attribution;
    }

    @Override
    public String sourceType() {
        return "receipt";
    }

    @Override
    public List<Credit> derive(Long id) {
        List<?> rows = em.createNativeQuery(
                        "SELECT transaction_type, status, approval_status, paid_amount, amount, transaction_date, created_at, " +
                        "branch_id, processed_by_staff_id, processed_by, created_by FROM receipts WHERE id = :id")
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return List.of();
        Object[] r = (Object[]) rows.get(0);
        String type = Rows.str(r[0]);
        String status = Rows.str(r[1]);
        String approval = Rows.str(r[2]);
        LocalDateTime when = Rows.dateTime(r[5]) != null ? Rows.dateTime(r[5]) : Rows.dateTime(r[6]);
        Long branchId = Rows.lng(r[7]);
        Long staffId = Rows.lng(r[8]);

        if (staffId == null) {
            staffId = attribution.resolve(Rows.str(r[9]), "Mobile App".equalsIgnoreCase(Rows.str(r[9])) ? null : Rows.str(r[10]));
            if (staffId != null) {
                em.createNativeQuery("UPDATE receipts SET processed_by_staff_id = :s WHERE id = :id AND processed_by_staff_id IS NULL")
                        .setParameter("s", staffId).setParameter("id", id).executeUpdate();
            }
        }

        if (!"New".equals(type) || !counts(status, approval) || when == null) return List.of();
        BigDecimal received = receivedAmount(status, Rows.money(r[3]), Rows.money(r[4]));
        return List.of(new Credit(Metric.MEMBER_ADMISSION, staffId, branchId, when, 1, received));
    }

    /** Money actually received: the paid portion of a part-payment, never its full price. */
    static BigDecimal receivedAmount(String status, BigDecimal paidAmount, BigDecimal amount) {
        if (paidAmount != null) return paidAmount;
        return "Paid".equals(status) && amount != null ? amount : BigDecimal.ZERO;
    }

    /** Paid or part-paid, and not a mobile payment still awaiting (or refused) approval. */
    static boolean counts(String status, String approvalStatus) {
        if (status == null || !REVENUE_STATUSES.contains(status)) return false;
        if (approvalStatus == null) return true;
        String a = approvalStatus.toUpperCase();
        return !a.equals("PENDING") && !a.equals("REJECTED");
    }

    @Override
    public List<Long> sourceIds(Long branchId, LocalDateTime from, LocalDateTime to) {
        return SourceIds.query(em, "SELECT id FROM receipts WHERE transaction_type = 'New'", "branch_id", "COALESCE(transaction_date, created_at)", branchId, from, to);
    }
}
