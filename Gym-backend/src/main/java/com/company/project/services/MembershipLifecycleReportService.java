package com.company.project.services;

import com.company.project.entities.Member;
import com.company.project.entities.MembershipFreeze;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipFreezeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Member lifecycle reports for the web Members → Reports tab: expired memberships,
 * memberships expiring soon, new joiners, and freeze/unfreeze history.
 *
 * Runs @Transactional so the branch filter applies to Member; freezes carry no
 * branch of their own, so they are scoped through their member (a freeze whose
 * member isn't visible in the active branch is left out).
 *
 * Rows are Maps with camelCase keys (the global SNAKE_CASE strategy doesn't touch Map keys).
 */
@Service
@Transactional(readOnly = true)
public class MembershipLifecycleReportService {

    private final MemberRepository memberRepository;
    private final MembershipFreezeRepository freezeRepository;

    public MembershipLifecycleReportService(MemberRepository memberRepository,
                                            MembershipFreezeRepository freezeRepository) {
        this.memberRepository = memberRepository;
        this.freezeRepository = freezeRepository;
    }

    /** expired | expiring | joined, for dates in [from, to] (inclusive). */
    public List<Map<String, Object>> memberReport(String type, LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Member m : memberRepository.findAll()) {
            LocalDate expiry = expiryOf(m);
            LocalDate joined = m.getJoinDate() != null ? m.getJoinDate().toLocalDate() : null;
            boolean include = switch (type) {
                // Expired in the window and not renewed since (a renewal moves the expiry forward)
                case "expired" -> expiry != null && !expiry.isBefore(from) && !expiry.isAfter(to) && expiry.isBefore(today);
                // Still running, ending inside the window
                case "expiring" -> expiry != null && !expiry.isBefore(from) && !expiry.isAfter(to)
                        && !expiry.isBefore(today) && !"expired".equalsIgnoreCase(m.getMembershipStatus());
                case "joined" -> joined != null && !joined.isBefore(from) && !joined.isAfter(to);
                default -> throw new IllegalArgumentException("Unknown report type: " + type);
            };
            if (include) rows.add(memberRow(m, expiry, today));
        }
        Comparator<Map<String, Object>> order = switch (type) {
            case "joined" -> Comparator.comparing((Map<String, Object> r) -> (String) r.get("joinDate"), Comparator.nullsLast(Comparator.reverseOrder()));
            case "expiring" -> Comparator.comparing((Map<String, Object> r) -> (String) r.get("expiryDate"), Comparator.nullsLast(Comparator.naturalOrder()));
            default -> Comparator.comparing((Map<String, Object> r) -> (String) r.get("expiryDate"), Comparator.nullsLast(Comparator.reverseOrder()));
        };
        rows.sort(order);
        return rows;
    }

    /** Freezes that were active at any point in [from, to] (inclusive). */
    public List<Map<String, Object>> freezeReport(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<MembershipFreeze> freezes = freezeRepository.findAll().stream()
                .filter(f -> f.getFreezeStart() != null && f.getFreezeStart().isBefore(end))
                .filter(f -> f.getEndedAt() == null || !f.getEndedAt().isBefore(start))
                .toList();

        Map<Long, Member> members = memberRepository.findAllById(
                        freezes.stream().map(MembershipFreeze::getMemberDbId).distinct().toList())
                .stream().collect(Collectors.toMap(Member::getId, Function.identity()));

        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (MembershipFreeze f : freezes) {
            Member m = members.get(f.getMemberDbId());
            if (m == null) continue; // other branch, or member deleted
            boolean active = f.getEndedAt() == null;
            LocalDateTime until = active ? now : f.getEndedAt();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", f.getId());
            row.put("memberDbId", m.getId());
            row.put("memberId", m.getMemberId());
            row.put("name", m.getName());
            row.put("phone", m.getPhone());
            row.put("membershipType", m.getMembershipType());
            row.put("plan", f.getPlanName() != null ? f.getPlanName() : m.getMembershipPlan());
            row.put("freezeStart", f.getFreezeStart().toLocalDate().toString());
            row.put("plannedEnd", f.getPlannedEnd() != null ? f.getPlannedEnd().toLocalDate().toString() : null);
            row.put("endedAt", f.getEndedAt() != null ? f.getEndedAt().toLocalDate().toString() : null);
            row.put("status", active ? "Frozen" : "Unfrozen");
            row.put("requestedDays", f.getRequestedDays());
            row.put("daysFrozen", Math.max(0, ChronoUnit.DAYS.between(f.getFreezeStart().toLocalDate(), until.toLocalDate())));
            row.put("freeDays", f.getFreeDaysApplied());
            row.put("chargedDays", f.getChargedDays());
            row.put("chargeAmount", f.getChargeAmount() != null ? f.getChargeAmount() : BigDecimal.ZERO);
            row.put("reason", f.getReason());
            row.put("source", f.getSource());
            rows.add(row);
        }
        rows.sort(Comparator.comparing((Map<String, Object> r) -> (String) r.get("freezeStart")).reversed());
        return rows;
    }

    private static LocalDate expiryOf(Member m) {
        LocalDateTime e = m.getExpiryDate() != null ? m.getExpiryDate() : m.getMembershipEndDate();
        return e != null ? e.toLocalDate() : null;
    }

    private static Map<String, Object> memberRow(Member m, LocalDate expiry, LocalDate today) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("memberDbId", m.getId());
        row.put("memberId", m.getMemberId());
        row.put("name", m.getName());
        row.put("phone", m.getPhone());
        row.put("email", m.getEmail());
        row.put("membershipType", m.getMembershipType());
        row.put("plan", m.getMembershipPlan());
        row.put("status", m.getMembershipStatus());
        row.put("joinDate", m.getJoinDate() != null ? m.getJoinDate().toLocalDate().toString() : null);
        row.put("startDate", m.getMembershipStartDate() != null ? m.getMembershipStartDate().toLocalDate().toString() : null);
        row.put("expiryDate", expiry != null ? expiry.toString() : null);
        // Negative = days since it expired, positive = days left
        row.put("daysFromToday", expiry != null ? ChronoUnit.DAYS.between(today, expiry) : null);
        row.put("outstandingBalance", m.getOutstandingBalance() != null ? m.getOutstandingBalance() : BigDecimal.ZERO);
        return row;
    }
}
