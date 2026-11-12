package com.company.project.performance.events;

import com.company.project.performance.PerformanceClock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/**
 * Training package enrolments (PT_SALE and PT_REVENUE, see {@link PackageEarnings}).
 * Reconciled when the enrolment, one of its bookings, or the add-on it was sold as changes.
 *
 * Money received comes from the add-on sale: nothing while its payment awaits approval or was
 * rejected; for a cancelled add-on, what had been paid before the refund (so shares already
 * earned stay); otherwise its receipt's paid amount once that counts as revenue.
 */
@Component
public class EnrolmentDeriver implements SourceDeriver {

    /** A booking that used a session: checked in, or a no-show when the package counts those. */
    public static final String USED_BOOKING =
            "LOWER(COALESCE(b.status, '')) <> 'cancelled' AND (b.checked_in_at IS NOT NULL " +
            "OR LOWER(COALESCE(b.status, '')) = 'checked-in' " +
            "OR (LOWER(COALESCE(b.status, '')) = 'no-show' AND e.no_show_policy <> 'not_counted'))";

    @PersistenceContext
    private EntityManager em;

    private final PerformanceClock clock;

    public EnrolmentDeriver(PerformanceClock clock) {
        this.clock = clock;
    }

    @Override
    public String sourceType() {
        return "enrolment";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Credit> derive(Long id) {
        List<?> rows = em.createNativeQuery(
                        "SELECT e.branch_id, e.plan_type, e.commission_timing, e.unused_at_expiry, e.sessions_total, " +
                        "e.validity_days, e.start_date, e.end_date, e.trainer_id, e.status, e.cancelled_at, " +
                        "a.status, a.amount, a.refunded_amount, a.purchase_date, a.created_at, " +
                        "r.status, r.approval_status, r.paid_amount, r.total_paid_to_date, r.amount, e.created_at " +
                        "FROM package_enrolments e " +
                        "LEFT JOIN member_addons a ON a.id = e.member_addon_id " +
                        "LEFT JOIN receipts r ON r.id = a.receipt_id " +
                        "WHERE e.id = :id")
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return List.of();
        Object[] r = (Object[]) rows.get(0);
        Long branchId = Rows.lng(r[0]);

        BigDecimal money = moneyReceived(Rows.str(r[11]), Rows.money(r[12]), Rows.money(r[13]),
                Rows.str(r[16]), Rows.str(r[17]), Rows.money(r[18]), Rows.money(r[19]), Rows.money(r[20]));

        LocalDate cancelledOn = null;
        if ("cancelled".equalsIgnoreCase(Rows.str(r[9]))) {
            LocalDateTime at = Rows.dateTime(r[10]);
            cancelledOn = at != null
                    ? at.atOffset(ZoneOffset.UTC).atZoneSameInstant(clock.zone(branchId)).toLocalDate()
                    : LocalDate.now(clock.zone(branchId));
        }
        LocalDateTime saleAt = Rows.dateTime(r[14]) != null ? Rows.dateTime(r[14])
                : Rows.dateTime(r[15]) != null ? Rows.dateTime(r[15]) : Rows.dateTime(r[21]);

        List<PackageEarnings.TrainerChange> changes = new ArrayList<>();
        for (Object[] c : (List<Object[]>) em.createNativeQuery(
                        "SELECT effective_date, from_trainer_id, to_trainer_id FROM package_trainer_changes " +
                        "WHERE enrolment_id = :id ORDER BY effective_date, id")
                .setParameter("id", id).getResultList()) {
            changes.add(new PackageEarnings.TrainerChange(Rows.date(c[0]), Rows.lng(c[1]), Rows.lng(c[2])));
        }

        List<PackageEarnings.UsedSession> used = new ArrayList<>();
        for (Object[] b : (List<Object[]>) em.createNativeQuery(
                        "SELECT b.id, s.date, s.start_time, s.trainer_id FROM bookings b " +
                        "JOIN training_sessions s ON s.id = b.session_id " +
                        "JOIN package_enrolments e ON e.id = b.enrolment_id " +
                        "WHERE b.enrolment_id = :id AND " + USED_BOOKING + " " +
                        "ORDER BY s.date, s.start_time, b.id")
                .setParameter("id", id).getResultList()) {
            used.add(new PackageEarnings.UsedSession(Rows.lng(b[0]), Rows.date(b[1]), Rows.time(b[2]), Rows.lng(b[3])));
        }

        PackageEarnings.Enrolment e = new PackageEarnings.Enrolment(branchId, Rows.str(r[1]), Rows.str(r[2]),
                Rows.str(r[3]), r[4] != null ? Rows.integer(r[4]) : null, Rows.integer(r[5]),
                Rows.date(r[6]), Rows.date(r[7]), Rows.lng(r[8]), changes, saleAt, money, cancelledOn);
        return PackageEarnings.credits(e, used, local -> clock.toUtc(local, branchId));
    }

    /** What the member paid for the package (see the class comment). */
    static BigDecimal moneyReceived(String addonStatus, BigDecimal addonAmount, BigDecimal refunded,
                                    String receiptStatus, String approval, BigDecimal paid,
                                    BigDecimal paidToDate, BigDecimal receiptAmount) {
        String a = addonStatus != null ? addonStatus.trim().toLowerCase() : "";
        if (a.equals("pending approval") || a.equals("rejected")) return BigDecimal.ZERO;
        if (a.equals("cancelled")) return refunded != null ? refunded : BigDecimal.ZERO;
        if (receiptStatus == null) return addonAmount != null ? addonAmount : BigDecimal.ZERO;
        if (!ReceiptDeriver.counts(receiptStatus, approval)) return BigDecimal.ZERO;
        if (paidToDate != null) return paidToDate;
        return ReceiptDeriver.receivedAmount(receiptStatus, paid, receiptAmount);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Long> sourceIds(Long branchId, LocalDateTime from, LocalDateTime to) {
        // An enrolment earns across its whole run, so any overlap with the window counts.
        StringBuilder sql = new StringBuilder("SELECT id FROM package_enrolments WHERE 1 = 1");
        if (branchId != null) sql.append(" AND branch_id = :branch");
        if (from != null) sql.append(" AND end_date >= CAST(:from AS DATE) - 1");
        if (to != null) sql.append(" AND LEAST(start_date, CAST(created_at AS DATE)) < CAST(:to AS DATE) + 1");
        sql.append(" ORDER BY 1");
        Query q = em.createNativeQuery(sql.toString());
        if (branchId != null) q.setParameter("branch", branchId);
        if (from != null) q.setParameter("from", from);
        if (to != null) q.setParameter("to", to);
        return ((List<Number>) q.getResultList()).stream().map(Number::longValue).toList();
    }
}
