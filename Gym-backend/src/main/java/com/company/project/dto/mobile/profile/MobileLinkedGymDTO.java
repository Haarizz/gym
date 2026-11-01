package com.company.project.dto.mobile.profile;

import java.time.LocalDate;

/**
 * A gym (tenant) whose members table holds a row linked to the caller's app account —
 * one entry in the app's gym switcher (see GlobalMembershipService.findLinkedGyms).
 *
 * @param active     the membership is usable right now: {@code status == ACTIVE}
 * @param gymName    display name; falls back to the tenant slug when the gym can't be read
 * @param status     ACTIVE, EXPIRED, INACTIVE (frozen, cancelled…), SUSPENDED,
 *                   PENDING_APPROVAL, PAYMENT_REJECTED, or UNAVAILABLE when the gym's
 *                   database couldn't be reached
 * @param expiryDate end of the current membership period, if it has one
 */
public record MobileLinkedGymDTO(
        String tenantSlug,
        boolean active,
        String gymName,
        Long branchId,
        String branchName,
        String planName,
        String status,
        LocalDate expiryDate) {
}
