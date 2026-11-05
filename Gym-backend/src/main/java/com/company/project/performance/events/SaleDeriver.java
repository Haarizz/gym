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
 * POS_SALE: a completed POS sale, net of refunds, credited to the cashier. A fully refunded
 * (REFUNDED) or voided sale is credited nothing, so it reverses whatever it earned.
 */
@Component
public class SaleDeriver implements SourceDeriver {

    @PersistenceContext
    private EntityManager em;

    private final StaffAttribution attribution;

    public SaleDeriver(StaffAttribution attribution) {
        this.attribution = attribution;
    }

    @Override
    public String sourceType() {
        return "sale";
    }

    @Override
    public List<Credit> derive(Long id) {
        List<?> rows = em.createNativeQuery(
                        "SELECT status, total_amount, refunded_amount, created_at, branch_id, cashier_staff_id, created_by, cashier_name " +
                        "FROM sale_transactions WHERE id = :id")
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return List.of();
        Object[] r = (Object[]) rows.get(0);
        Long staffId = Rows.lng(r[5]);
        if (staffId == null) {
            // The till's login is who rang it up; the printed cashier name only as a fallback.
            staffId = attribution.byLogin(Rows.str(r[6]));
            if (staffId == null) staffId = attribution.byExactName(Rows.str(r[7]));
            if (staffId != null) {
                em.createNativeQuery("UPDATE sale_transactions SET cashier_staff_id = :s WHERE id = :id AND cashier_staff_id IS NULL")
                        .setParameter("s", staffId).setParameter("id", id).executeUpdate();
            }
        }
        LocalDateTime when = Rows.dateTime(r[3]);
        if (!"COMPLETED".equals(Rows.str(r[0])) || when == null) return List.of();
        BigDecimal net = net(Rows.money(r[1]), Rows.money(r[2]));
        if (net.signum() <= 0) return List.of();
        return List.of(new Credit(Metric.POS_SALE, staffId, Rows.lng(r[4]), when, 1, net));
    }

    static BigDecimal net(BigDecimal total, BigDecimal refunded) {
        BigDecimal t = total != null ? total : BigDecimal.ZERO;
        BigDecimal f = refunded != null ? refunded : BigDecimal.ZERO;
        return t.subtract(f).max(BigDecimal.ZERO);
    }

    @Override
    public List<Long> sourceIds(Long branchId, LocalDateTime from, LocalDateTime to) {
        return SourceIds.query(em, "SELECT id FROM sale_transactions WHERE 1 = 1", "branch_id", "created_at", branchId, from, to);
    }
}
