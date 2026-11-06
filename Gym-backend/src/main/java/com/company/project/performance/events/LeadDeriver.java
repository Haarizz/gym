package com.company.project.performance.events;

import com.company.project.performance.attribution.StaffAttribution;
import com.company.project.performance.metric.Metric;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * LEAD_CONVERSION: a lead marked converted, credited to its assignee. Count only (plan §10 Q3):
 * the member's first payment is already credited as an admission.
 *
 * Leads are assigned by name, so the stored assignee id follows the name: when the name changes
 * and identifies exactly one employee, the id moves with it. An id set by an admin on the
 * Unassigned screen is kept while the name can't be resolved.
 */
@Component
public class LeadDeriver implements SourceDeriver {

    @PersistenceContext
    private EntityManager em;

    private final StaffAttribution attribution;

    public LeadDeriver(StaffAttribution attribution) {
        this.attribution = attribution;
    }

    @Override
    public String sourceType() {
        return "lead";
    }

    @Override
    public List<Credit> derive(Long id) {
        List<?> rows = em.createNativeQuery(
                        "SELECT l.status, l.last_contact_date, l.updated_at, l.created_at, l.branch_id, l.assigned_staff_id, " +
                        "l.assigned_staff, l.created_by, e.name FROM leads l LEFT JOIN employees e ON e.id = l.assigned_staff_id " +
                        "WHERE l.id = :id")
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return List.of();
        Object[] r = (Object[]) rows.get(0);
        Long staffId = Rows.lng(r[5]);
        String assignedName = Rows.str(r[6]);
        String storedName = Rows.str(r[8]);

        Long resolved = staffId;
        boolean blank = assignedName == null || assignedName.isBlank();
        if (blank) {
            resolved = staffId != null ? staffId : attribution.byLogin(Rows.str(r[7]));
        } else if (staffId == null || storedName == null || !storedName.trim().equalsIgnoreCase(assignedName.trim())) {
            Long byName = attribution.byExactName(assignedName);
            if (byName != null) resolved = byName;
        }
        if (!Objects.equals(resolved, staffId)) {
            em.createNativeQuery("UPDATE leads SET assigned_staff_id = :s WHERE id = :id")
                    .setParameter("s", resolved).setParameter("id", id).executeUpdate();
            staffId = resolved;
        }

        if (!"converted".equalsIgnoreCase(Rows.str(r[0]))) return List.of();
        LocalDateTime when = Rows.dateTime(r[1]);
        if (when == null) when = Rows.dateTime(r[2]);
        if (when == null) when = Rows.dateTime(r[3]);
        if (when == null) return List.of();
        return List.of(new Credit(Metric.LEAD_CONVERSION, staffId, Rows.lng(r[4]), when, 1, null));
    }

    @Override
    public List<Long> sourceIds(Long branchId, LocalDateTime from, LocalDateTime to) {
        return SourceIds.query(em, "SELECT id FROM leads WHERE LOWER(status) = 'converted'", "branch_id", "COALESCE(last_contact_date, updated_at, created_at)", branchId, from, to);
    }
}
