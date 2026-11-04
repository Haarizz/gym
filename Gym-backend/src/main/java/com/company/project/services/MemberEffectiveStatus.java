package com.company.project.services;

import com.company.project.entities.Member;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;

/**
 * A member's status as it really is today. members.membership_status is never flipped to
 * "expired" when the end date passes (imported members included), so anything shown to a
 * person must use this, not the stored value — the same rule as the web Members
 * directory's getComputedStatus() and MemberService's status filter.
 */
public final class MemberEffectiveStatus {

    private MemberEffectiveStatus() {}

    /**
     * Lower-case status: "suspended" (staff suspension wins), "pending_approval" / "frozen"
     * / "suspended" as stored (deliberate pauses, never "expired"), "expired" once the end
     * date has passed (the end date itself still counts as active), otherwise the stored
     * value lower-cased. Null when nothing is stored.
     */
    public static String of(Member m) {
        if (m == null) return null;
        if (m.isMembershipSuspended()) return "suspended";
        String raw = m.getMembershipStatus() == null ? "" : m.getMembershipStatus().trim().toLowerCase(Locale.ROOT);
        if (raw.equals("pending_approval") || raw.equals("frozen") || raw.equals("suspended")) return raw;
        LocalDateTime end = m.getMembershipEndDate() != null ? m.getMembershipEndDate() : m.getExpiryDate();
        if (end != null && end.toLocalDate().isBefore(LocalDate.now())) return "expired";
        return raw.isEmpty() ? null : raw;
    }

    public static boolean isActive(Member m) {
        return "active".equals(of(m));
    }
}
