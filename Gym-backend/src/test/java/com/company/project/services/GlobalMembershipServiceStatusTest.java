package com.company.project.services;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** The status each gym shows in the app's gym switcher. */
class GlobalMembershipServiceStatusTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 1, 12, 0);

    private static String status(String membershipStatus, String approval, boolean suspended, LocalDateTime endsAt) {
        return GlobalMembershipService.statusOf(membershipStatus, approval, suspended, endsAt, NOW);
    }

    @Test
    void activeWhenStatusActiveAndNotExpired() {
        assertEquals("ACTIVE", status("active", null, false, NOW.plusDays(10)));
        assertEquals("ACTIVE", status("Active", "APPROVED", false, null));
    }

    @Test
    void expiredByDateOrStatus() {
        assertEquals("EXPIRED", status("active", null, false, NOW.minusDays(1)));
        assertEquals("EXPIRED", status("expired", null, false, null));
    }

    @Test
    void otherStatusesAreInactive() {
        assertEquals("INACTIVE", status("frozen", null, false, NOW.plusDays(10)));
        assertEquals("INACTIVE", status(null, null, false, null));
    }

    @Test
    void accessGateWinsOverExpiry() {
        assertEquals("SUSPENDED", status("active", "PENDING", true, NOW.minusDays(1)));
        assertEquals("PENDING_APPROVAL", status("active", "PENDING", false, NOW.minusDays(1)));
        assertEquals("PAYMENT_REJECTED", status("active", "REJECTED", false, null));
    }
}
