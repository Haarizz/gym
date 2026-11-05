package com.company.project.performance.attribution;

import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.events.PerformanceEventRecorder;
import com.company.project.security.BranchContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * The "Unassigned sales" screen (plan §4.1): admissions, POS sales and lead conversions no staff
 * member could be matched to, so an admin credits them by hand instead of the system guessing.
 */
@Service
public class UnassignedService {

    @PersistenceContext
    private EntityManager em;

    private final PerformanceEventRecorder recorder;
    private final StaffAttribution attribution;

    public UnassignedService(PerformanceEventRecorder recorder, StaffAttribution attribution) {
        this.recorder = recorder;
        this.attribution = attribution;
    }

    private record Source(String table, String column, String where, String date, String title, String person, String amount) {}

    private static final Map<String, Source> SOURCES = Map.of(
            "receipt", new Source("receipts", "processed_by_staff_id",
                    "transaction_type = 'New' AND status IN ('Paid', 'Partial') AND COALESCE(processed_by, '') <> 'Mobile App'",
                    "COALESCE(transaction_date, created_at)", "COALESCE(plan_name, receipt_no)", "processed_by",
                    "COALESCE(paid_amount, amount)"),
            "sale", new Source("sale_transactions", "cashier_staff_id", "status = 'COMPLETED'",
                    "created_at", "transaction_number", "cashier_name", "total_amount - COALESCE(refunded_amount, 0)"),
            "lead", new Source("leads", "assigned_staff_id", "LOWER(status) = 'converted'",
                    "COALESCE(last_contact_date, updated_at, created_at)", "TRIM(first_name || ' ' || COALESCE(last_name, ''))",
                    "assigned_staff", "NULL"));

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public Map<String, Object> list(LocalDateTime since) {
        Long branch = BranchContextHolder.getActiveBranchId();
        Map<String, Object> out = new LinkedHashMap<>();
        int total = 0;
        for (String type : List.of("receipt", "sale", "lead")) {
            Source s = SOURCES.get(type);
            String sql = "SELECT id, " + s.date() + ", " + s.title() + ", " + s.person() + ", " + s.amount() + ", created_by, branch_id FROM "
                    + s.table() + " WHERE " + s.column() + " IS NULL AND " + s.where() + " AND " + s.date() + " >= :since"
                    + (branch != null ? " AND branch_id = :branch" : "") + " ORDER BY 2 DESC LIMIT 200";
            Query q = em.createNativeQuery(sql).setParameter("since", since);
            if (branch != null) q.setParameter("branch", branch);
            List<Map<String, Object>> rows = new ArrayList<>();
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", ((Number) r[0]).longValue());
                m.put("date", r[1] != null ? r[1].toString() : null);
                m.put("title", r[2]);
                m.put("recorded_as", r[3]);
                m.put("amount", r[4]);
                m.put("created_by", r[5]);
                m.put("branch_id", r[6]);
                rows.add(m);
            }
            total += rows.size();
            out.put(type + "s", rows);
        }
        out.put("total", total);
        return out;
    }

    /** Credits the row to a staff member (or clears it with null) and updates the ledger. */
    public void assign(String type, Long id, Long staffId) {
        Source s = SOURCES.get(type);
        if (s == null) throw new BusinessRuleViolationException("Unknown source type " + type);
        if (staffId != null && !attribution.exists(staffId)) throw new EntityNotFoundException("Employee not found");
        recorder.reconcileInNewTransactionAfter(() -> {
            int n = em.createNativeQuery("UPDATE " + s.table() + " SET " + s.column() + " = :staff WHERE id = :id")
                    .setParameter("staff", staffId).setParameter("id", id).executeUpdate();
            if (n == 0) throw new EntityNotFoundException("Record not found");
        }, type, id);
    }
}
