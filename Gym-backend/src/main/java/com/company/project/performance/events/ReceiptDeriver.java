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
 * Receipts with money received — fully paid or part-paid (its paid portion), and for a mobile
 * Cash/Credit/Mixed payment only once reception has approved it.
 *
 *  - MEMBER_ADMISSION: a "New" receipt, credited to the staff member who processed it.
 *  - PT_SALE and PT_REVENUE: a "Class Booking" receipt for a normal (not package-covered) PT
 *    session, credited to the session's trainer on the payment date, less anything refunded.
 *    Commission on a single paid session counts when the member pays, so both move together.
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

        if (!counts(status, approval) || when == null) return List.of();
        BigDecimal received = receivedAmount(status, Rows.money(r[3]), Rows.money(r[4]));
        if ("New".equals(type)) return List.of(new Credit(Metric.MEMBER_ADMISSION, staffId, branchId, when, 1, received));
        if (TXN_CLASS_BOOKING.equals(type)) return ptBooking(id, branchId, when, received);
        return List.of();
    }

    static final String TXN_CLASS_BOOKING = "Class Booking";

    /** A paid PT session booking: the money received less refunds, to the session's trainer. */
    private List<Credit> ptBooking(Long receiptId, Long branchId, LocalDateTime when, BigDecimal received) {
        List<?> rows = em.createNativeQuery(
                        "SELECT s.trainer_id, b.refunded_amount FROM bookings b " +
                        "JOIN training_sessions s ON s.id = b.session_id " +
                        "WHERE b.receipt_id = :id AND b.enrolment_id IS NULL AND LOWER(COALESCE(s.type, '')) = 'pt' " +
                        "ORDER BY b.id")
                .setParameter("id", receiptId).setMaxResults(1).getResultList();
        if (rows.isEmpty()) return List.of();
        Object[] b = (Object[]) rows.get(0);
        BigDecimal refunded = Rows.money(b[1]) != null ? Rows.money(b[1]) : BigDecimal.ZERO;
        BigDecimal net = (received != null ? received : BigDecimal.ZERO).subtract(refunded);
        if (net.signum() <= 0) return List.of();
        Long trainerId = Rows.lng(b[0]);
        return List.of(new Credit(Metric.PT_SALE, trainerId, branchId, when, 1, net),
                new Credit(Metric.PT_REVENUE, trainerId, branchId, when, 0, net));
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
        return SourceIds.query(em, "SELECT id FROM receipts WHERE transaction_type IN ('New', '" + TXN_CLASS_BOOKING + "')", "branch_id", "COALESCE(transaction_date, created_at)", branchId, from, to);
    }
}
