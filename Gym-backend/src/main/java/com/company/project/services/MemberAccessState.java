package com.company.project.services;

import com.company.project.entities.Member;

/**
 * What a member's record at one gym lets them use in the app right now. It gates only
 * that gym's member features (dashboard, bookings, check-in, membership, payments...)
 * — never sign-in, profile, Community browsing or gym discovery, which belong to the
 * person's account, not to any gym (docs/global-accounts-for-gym-created-members-plan.md §5).
 *
 * A staff suspension wins over the payment states, so approving a payment can't lift it.
 */
public enum MemberAccessState {
    ACTIVE,
    SUSPENDED,
    PENDING_APPROVAL,
    PAYMENT_REJECTED;

    /** The same rule as {@link #of(boolean, String)}, for queries over the members table. */
    public static final String SQL_ALLOWS_MEMBER_FEATURES =
            "membership_suspended = FALSE"
                    + " AND (approval_status IS NULL OR approval_status NOT IN ('PENDING', 'REJECTED'))";

    public static MemberAccessState of(Member member) {
        return of(member.isMembershipSuspended(), member.getApprovalStatus());
    }

    public static MemberAccessState of(boolean suspended, String approvalStatus) {
        if (suspended) {
            return SUSPENDED;
        }
        if ("PENDING".equals(approvalStatus)) {
            return PENDING_APPROVAL;
        }
        if ("REJECTED".equals(approvalStatus)) {
            return PAYMENT_REJECTED;
        }
        return ACTIVE;
    }

    public boolean allowsMemberFeatures() {
        return this == ACTIVE;
    }

    /** Shown to the member when one of this gym's member endpoints is refused. */
    public String refusalMessage() {
        return switch (this) {
            case SUSPENDED -> "Your membership at this gym has been suspended. Please contact the gym.";
            case PENDING_APPROVAL -> "Your membership payment is awaiting approval.";
            case PAYMENT_REJECTED -> "Your membership payment was not approved.";
            case ACTIVE -> null;
        };
    }
}
