package com.company.project.services;

import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;

/**
 * A staff suspension closes everything the member does at the gym, from every side —
 * not just the member app (MemberAccessState / TenantContextFilter) and check-in: no
 * payments, renewals, add-ons, bookings, freezes, POS sales or wallet spending until the
 * membership is resumed. The record itself stays (history, reports, refunds/rejections).
 */
public final class MemberSuspension {

    private MemberSuspension() {}

    /** @param action what was refused, e.g. "taking a payment" — finishes "resume the membership before …". */
    public static void requireNotSuspended(Member member, String action) {
        if (member == null || !member.isMembershipSuspended()) return;
        String who = member.getName() != null ? member.getName() : "This member";
        if (member.getMemberId() != null) who += " (" + member.getMemberId() + ")";
        String reason = member.getSuspendedReason() != null && !member.getSuspendedReason().isBlank()
                ? " Reason: " + member.getSuspendedReason().trim() + "." : "";
        throw new BusinessRuleViolationException(who + " is suspended — resume the membership before " + action + "." + reason);
    }
}
