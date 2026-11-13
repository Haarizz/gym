package com.company.project.packages;

import com.company.project.entities.Booking;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.PackageEnrolment;
import com.company.project.entities.TrainingPackage;
import com.company.project.entities.TrainingSession;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.performance.PerformanceClock;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.PackageEnrolmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * How much of a training package is used, and which package a PT booking draws on. Depends only
 * on repositories, so the booking and add-on services can use it without a dependency cycle.
 *
 * A booking <b>uses</b> a session when it is checked in, or marked no-show while the package
 * counts no-shows. It <b>holds</b> one (towards the limit) from booking until it's cancelled —
 * except a no-show the package doesn't count, which hands the session back.
 */
@Service
@Transactional
public class PackageUsageService {

    public static final String STATUS_UPCOMING = "upcoming";
    public static final String STATUS_COMPLETED = "completed";
    public static final String STATUS_EXPIRED = "expired";

    private final PackageEnrolmentRepository enrolments;
    private final BookingRepository bookings;
    private final MemberAddonRepository addons;
    private final PerformanceClock clock;

    public PackageUsageService(PackageEnrolmentRepository enrolments, BookingRepository bookings,
                               MemberAddonRepository addons, PerformanceClock clock) {
        this.enrolments = enrolments;
        this.bookings = bookings;
        this.addons = addons;
        this.clock = clock;
    }

    /** used = sessions used so far; held = sessions taken towards the limit (used + upcoming bookings). */
    public record Usage(int used, int held, int upcoming) {
        public static final Usage NONE = new Usage(0, 0, 0);
    }

    public static boolean isUsed(String status, LocalDateTime checkedInAt, boolean noShowCounts) {
        String s = status != null ? status.toLowerCase() : "";
        if (s.equals("cancelled")) return false;
        if (checkedInAt != null || s.equals("checked-in")) return true;
        return s.equals("no-show") && noShowCounts;
    }

    public static boolean isHeld(String status, LocalDateTime checkedInAt, boolean noShowCounts) {
        String s = status != null ? status.toLowerCase() : "";
        if (s.equals("cancelled") || s.equals("waitlisted")) return false;
        if (s.equals("no-show") && checkedInAt == null) return noShowCounts;
        return true;
    }

    @Transactional(readOnly = true)
    public Map<Long, Usage> usage(Collection<PackageEnrolment> list) {
        Map<Long, PackageEnrolment> byId = new HashMap<>();
        for (PackageEnrolment e : list) byId.put(e.getId(), e);
        Map<Long, Usage> out = new HashMap<>();
        if (byId.isEmpty()) return out;
        Map<Long, int[]> counts = new HashMap<>();
        for (Object[] r : enrolments.bookingStatesFor(new ArrayList<>(byId.keySet()))) {
            Long id = (Long) r[0];
            PackageEnrolment e = byId.get(id);
            String status = (String) r[1];
            LocalDateTime checkedIn = (LocalDateTime) r[2];
            int[] c = counts.computeIfAbsent(id, k -> new int[3]);
            boolean used = isUsed(status, checkedIn, e.noShowCounts());
            boolean held = isHeld(status, checkedIn, e.noShowCounts());
            if (used) c[0]++;
            if (held) c[1]++;
            if (held && !used) c[2]++;
        }
        counts.forEach((id, c) -> out.put(id, new Usage(c[0], c[1], c[2])));
        return out;
    }

    public Usage usage(PackageEnrolment e) {
        return usage(List.of(e)).getOrDefault(e.getId(), Usage.NONE);
    }

    public LocalDate today(PackageEnrolment e) {
        return LocalDate.now(clock.zone(e.getBranchId()));
    }

    public java.time.ZoneId zone(Long branchId) {
        return clock.zone(branchId);
    }

    /** cancelled | upcoming | completed | expired | active. */
    public String displayStatus(PackageEnrolment e, Usage u, LocalDate today) {
        if (PackageEnrolment.STATUS_CANCELLED.equals(e.getStatus())) return PackageEnrolment.STATUS_CANCELLED;
        if (TrainingPackage.TYPE_SESSIONS.equals(e.getPlanType()) && e.getSessionsTotal() != null
                && u.used() >= e.getSessionsTotal()) return STATUS_COMPLETED;
        if (today.isAfter(e.getEndDate())) return STATUS_EXPIRED;
        if (today.isBefore(e.getStartDate())) return STATUS_UPCOMING;
        return PackageEnrolment.STATUS_ACTIVE;
    }

    /**
     * The package a member's PT booking should use, locked for the rest of the transaction, or
     * null when none fits. With {@code requestedId} that package must fit (otherwise this says
     * why); without it, the one ending soonest. A package only covers sessions with its own
     * trainer — a session with anyone else is paid for separately (or the package's trainer is
     * changed first).
     */
    public PackageEnrolment pickFor(Long memberId, TrainingSession session, Long requestedId) {
        if (memberId == null || session == null || !"pt".equalsIgnoreCase(session.getType())) {
            if (requestedId != null) throw new BusinessRuleViolationException("Packages can only be used for PT sessions");
            return null;
        }
        if (requestedId != null) {
            PackageEnrolment e = enrolments.findByIdForUpdate(requestedId)
                    .orElseThrow(() -> new BusinessRuleViolationException("Package not found"));
            if (!memberId.equals(e.getMemberId())) {
                throw new BusinessRuleViolationException("This package belongs to another member");
            }
            String why = whyNotUsable(e, session);
            if (why != null) throw new BusinessRuleViolationException(why);
            return e;
        }
        List<PackageEnrolment> active = enrolments.findByMemberIdAndStatusOrderByEndDateAsc(memberId, PackageEnrolment.STATUS_ACTIVE);
        for (PackageEnrolment candidate : active) {
            if (whyNotUsable(candidate, session) != null) continue;
            PackageEnrolment locked = enrolments.findByIdForUpdate(candidate.getId()).orElse(null);
            if (locked != null && whyNotUsable(locked, session) == null) return locked;
        }
        return null;
    }

    /** The package that would cover this member's booking of the session (read only, not locked), or null. */
    @Transactional(readOnly = true)
    public PackageEnrolment coverFor(Long memberId, TrainingSession session) {
        if (memberId == null || session == null || !"pt".equalsIgnoreCase(session.getType())) return null;
        for (PackageEnrolment e : enrolments.findByMemberIdAndStatusOrderByEndDateAsc(memberId, PackageEnrolment.STATUS_ACTIVE)) {
            if (whyNotUsable(e, session) == null) return e;
        }
        return null;
    }

    /** Why this package can't cover the session, or null when it can. */
    String whyNotUsable(PackageEnrolment e, TrainingSession session) {
        if (!PackageEnrolment.STATUS_ACTIVE.equals(e.getStatus())) return "This package has been cancelled";
        Long sessionTrainer = session.getTrainer() != null ? session.getTrainer().getId() : null;
        if (sessionTrainer == null || !sessionTrainer.equals(e.getTrainerId())) {
            return "This package is only for sessions with its own trainer";
        }
        if (e.getMemberAddonId() != null) {
            MemberAddon addon = addons.findById(e.getMemberAddonId()).orElse(null);
            String s = addon != null && addon.getStatus() != null ? addon.getStatus().toLowerCase() : "";
            if (s.equals("pending approval")) return "This package's payment hasn't been approved yet";
            if (s.equals("rejected") || s.equals("cancelled")) return "This package is no longer valid";
        }
        LocalDate day = session.getDate();
        if (day != null && day.isBefore(e.getStartDate())) return "This package starts on " + e.getStartDate();
        if (day != null && day.isAfter(e.getEndDate())) return "This package ends on " + e.getEndDate();
        Integer limit = e.getSessionsTotal();
        if (limit != null && usage(e).held() >= limit) {
            return "All " + limit + " sessions of this package are used or booked";
        }
        return null;
    }

    /**
     * Marks the package cancelled (the add-on side — refund, receipt — is the caller's) and
     * cancels its upcoming bookings that haven't been used. Returns the sessions those bookings
     * were on, so the caller can move waitlisted members in.
     */
    public List<TrainingSession> markCancelled(PackageEnrolment e) {
        if (PackageEnrolment.STATUS_CANCELLED.equals(e.getStatus())) return List.of();
        e.setStatus(PackageEnrolment.STATUS_CANCELLED);
        e.setCancelledAt(PerformanceClock.nowUtc());
        enrolments.save(e);
        LocalDate today = today(e);
        List<TrainingSession> freed = new ArrayList<>();
        for (Booking b : bookings.findByEnrolmentIdWithSession(e.getId())) {
            TrainingSession s = b.getSession();
            boolean upcoming = s != null && s.getDate() != null && !s.getDate().isBefore(today);
            String status = b.getStatus() != null ? b.getStatus().toLowerCase() : "";
            if (!upcoming || isUsed(status, b.getCheckedInAt(), e.noShowCounts())
                    || status.equals("cancelled") || status.equals("no-show")) continue;
            b.setStatus("cancelled");
            b.setCancelledBy("STAFF");
            bookings.save(b);
            freed.add(s);
        }
        return freed;
    }

    @Transactional(readOnly = true)
    public boolean isPackageSale(Long memberAddonId) {
        return memberAddonId != null && enrolments.findByMemberAddonId(memberAddonId).isPresent();
    }

    /** The add-on a package was sold as was cancelled (Add-ons screen or the package's Cancel). */
    public List<TrainingSession> onAddonCancelled(Long memberAddonId) {
        if (memberAddonId == null) return List.of();
        return enrolments.findByMemberAddonId(memberAddonId).map(this::markCancelled).orElse(List.of());
    }
}
