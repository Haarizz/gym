package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardAlertDTO;
import com.company.project.entities.FollowUp;
import com.company.project.entities.Member;
import com.company.project.repositories.FollowUpRepository;
import com.company.project.repositories.MemberRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Dashboard alerts. Both alert types use the SELECTED dashboard date as their
 * reference point rather than the server's "now" — per the task's own guidance,
 * an expiry-forecast/current-state alert is not a historical transaction metric,
 * so it is deliberately re-anchored to whatever date the Admin is looking at
 * (defaults to the range's end date), not silently computed off "now".
 */
@Service
public class AdminDashboardAlertService {

    private static final int EXPIRY_WINDOW_DAYS = 7;

    private final MemberRepository memberRepository;
    private final FollowUpRepository followUpRepository;

    public AdminDashboardAlertService(MemberRepository memberRepository, FollowUpRepository followUpRepository) {
        this.memberRepository = memberRepository;
        this.followUpRepository = followUpRepository;
    }

    public List<AdminDashboardAlertDTO> getAlerts(AdminDashboardFilterContext ctx) {
        List<AdminDashboardAlertDTO> alerts = new ArrayList<>();

        LocalDateTime referenceDate = ctx.getDateRange().getEnd();
        LocalDateTime expiryWindowEnd = referenceDate.plusDays(EXPIRY_WINDOW_DAYS);
        List<Member> expiring = memberRepository.findExpiringBetween(referenceDate, expiryWindowEnd);
        if (!expiring.isEmpty()) {
            boolean urgent = expiring.stream().anyMatch(m ->
                    m.getExpiryDate() != null && m.getExpiryDate().isBefore(referenceDate.plusDays(2)));
            alerts.add(new AdminDashboardAlertDTO(
                    expiring.size() + " membership" + (expiring.size() == 1 ? "" : "s")
                            + " expiring in the next " + EXPIRY_WINDOW_DAYS + " days",
                    urgent, "membership_expiry"));
        }

        List<FollowUp> pending = followUpRepository.findAll(pendingFollowUpsInRange(ctx.getDateRange()));
        if (!pending.isEmpty()) {
            boolean urgent = pending.stream().anyMatch(f ->
                    f.getDueDate() != null && f.getDueDate().isBefore(LocalDateTime.now()));
            alerts.add(new AdminDashboardAlertDTO(
                    pending.size() + " follow-up" + (pending.size() == 1 ? "" : "s") + " pending",
                    urgent, "follow_up"));
        }

        return alerts;
    }

    private org.springframework.data.jpa.domain.Specification<FollowUp> pendingFollowUpsInRange(AdminDashboardDateRange range) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "pending"));
            predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), range.getStart()));
            predicates.add(cb.lessThan(root.get("dueDate"), range.getEnd()));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
