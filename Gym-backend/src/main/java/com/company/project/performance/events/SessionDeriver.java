package com.company.project.performance.events;

import com.company.project.performance.PerformanceClock;
import com.company.project.performance.metric.Metric;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Training sessions, credited to their trainer on the session's date and start time (gym local
 * time). Readers only count events up to now, so a session later this month counts once its
 * time arrives; cancelling it reverses the credit.
 *
 *  - PT_SESSION_DELIVERED: a PT session with a member who came — checked in, or a no-show
 *    (the trainer was there), unless the member used a package that doesn't count no-shows.
 *    The same rule decides when a package session is used, so the two always agree.
 *  - CLASS_TAUGHT: a class (not PT, not facility time) held with at least one such booking.
 *  - CLASS_ATTENDEE: members checked in to that class.
 */
@Component
public class SessionDeriver implements SourceDeriver {

    static final String ACTIVE_BOOKING = "LOWER(COALESCE(b.status, '')) NOT IN ('cancelled', 'pending_approval', 'waitlisted')";

    /** Booking {@code b} (package {@code e}, may be null) was delivered — see PT_SESSION_DELIVERED. */
    static final String DELIVERED = "(b.checked_in_at IS NOT NULL OR LOWER(COALESCE(b.status, '')) = 'checked-in' " +
            "OR (LOWER(COALESCE(b.status, '')) = 'no-show' AND (e.id IS NULL OR e.no_show_policy <> 'not_counted')))";

    @PersistenceContext
    private EntityManager em;

    private final PerformanceClock clock;

    public SessionDeriver(PerformanceClock clock) {
        this.clock = clock;
    }

    @Override
    public String sourceType() {
        return "session";
    }

    @Override
    public List<Credit> derive(Long id) {
        List<?> rows = em.createNativeQuery(
                        "SELECT s.type, s.status, s.date, s.start_time, s.trainer_id, s.branch_id, " +
                        "(SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id AND " + ACTIVE_BOOKING + "), " +
                        "(SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id AND b.checked_in_at IS NOT NULL AND " + ACTIVE_BOOKING + "), " +
                        "(SELECT COUNT(*) FROM bookings b LEFT JOIN package_enrolments e ON e.id = b.enrolment_id " +
                        "WHERE b.session_id = s.id AND " + ACTIVE_BOOKING + " AND " + DELIVERED + ") " +
                        "FROM training_sessions s WHERE s.id = :id")
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return List.of();
        Object[] r = (Object[]) rows.get(0);
        String type = Rows.str(r[0]) != null ? Rows.str(r[0]).toLowerCase() : "";
        String status = Rows.str(r[1]) != null ? Rows.str(r[1]).toLowerCase() : "";
        LocalDate date = Rows.date(r[2]);
        if ("cancelled".equals(status) || date == null || "facility".equals(type)) return List.of();
        int booked = Rows.integer(r[6]);
        int checkedIn = Rows.integer(r[7]);
        if (booked <= 0) return List.of();

        Long trainerId = Rows.lng(r[4]);
        Long branchId = Rows.lng(r[5]);
        LocalTime start = Rows.time(r[3]) != null ? Rows.time(r[3]) : LocalTime.MIDNIGHT;
        LocalDateTime when = clock.toUtc(date.atTime(start), branchId);

        List<Credit> out = new ArrayList<>();
        if ("pt".equals(type)) {
            if (Rows.integer(r[8]) <= 0) return List.of();
            out.add(new Credit(Metric.PT_SESSION_DELIVERED, trainerId, branchId, when, 1, null));
        } else {
            out.add(new Credit(Metric.CLASS_TAUGHT, trainerId, branchId, when, 1, null));
            if (checkedIn > 0) out.add(new Credit(Metric.CLASS_ATTENDEE, trainerId, branchId, when, checkedIn, null));
        }
        return out;
    }

    @Override
    public List<Long> sourceIds(Long branchId, LocalDateTime from, LocalDateTime to) {
        // Session dates are local days; widening by a day either side keeps zone offsets inside the window.
        return SourceIds.query(em, "SELECT s.id FROM training_sessions s WHERE LOWER(COALESCE(s.type, '')) <> 'facility' " +
                        "AND EXISTS (SELECT 1 FROM bookings b WHERE b.session_id = s.id)",
                "s.branch_id", "CAST(s.date AS TIMESTAMP)", branchId,
                from != null ? from.minusDays(1) : null, to != null ? to.plusDays(1) : null);
    }
}
