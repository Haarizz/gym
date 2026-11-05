package com.company.project.services;

import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;

import java.time.format.DateTimeFormatter;

/**
 * Locks on what can be done for a member.
 *
 * A staff suspension closes everything the member does at the gym, from every side —
 * not just the member app (MemberAccessState / TenantContextFilter) and check-in: no
 * payments, renewals, add-ons, bookings, freezes, POS sales or wallet spending until the
 * membership is resumed. The record itself stays (history, reports, refunds/rejections).
 *
 * A frozen membership is locked the same way (user rule, 2026-11-05): nothing can be sold,
 * booked, renewed or paid for it until it is unfrozen. Unfreezing — manual, by the member
 * in the app, or automatic on the planned end — and the freeze's own charge are allowed.
 */
public final class MemberSuspension {

    private MemberSuspension() {}

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy");

    /**
     * Suspension only — for the freeze actions themselves, which a frozen member must still reach.
     * @param action what was refused, e.g. "taking a payment" — finishes "resume the membership before …".
     */
    public static void requireNotSuspended(Member member, String action) {
        if (member == null || !member.isMembershipSuspended()) return;
        String reason = member.getSuspendedReason() != null && !member.getSuspendedReason().isBlank()
                ? " Reason: " + member.getSuspendedReason().trim() + "." : "";
        throw new BusinessRuleViolationException(who(member) + " is suspended — resume the membership before " + action + "." + reason);
    }

    public static boolean isFrozen(Member member) {
        return member != null && "frozen".equalsIgnoreCase(member.getMembershipStatus());
    }

    /** Not suspended and not frozen — the guard for every sale, booking, renewal and payment. */
    public static void requireUsable(Member member, String action) {
        requireNotSuspended(member, action);
        if (!isFrozen(member)) return;
        String until = member.getFreezeEndDate() != null ? " (frozen until " + member.getFreezeEndDate().format(DAY) + ")" : "";
        throw new BusinessRuleViolationException(who(member) + "'s membership is frozen" + until
                + " — unfreeze it before " + action + ".");
    }

    private static String who(Member member) {
        String who = member.getName() != null ? member.getName() : "This member";
        if (member.getMemberId() != null) who += " (" + member.getMemberId() + ")";
        return who;
    }
}
