package com.company.project.services;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class MemberAccessStateCancelledTest {

    @Test
    void cancelledWinsOverEverything() {
        assertEquals(MemberAccessState.CANCELLED, MemberAccessState.of(true, "PENDING", "cancelled"));
        assertFalse(MemberAccessState.CANCELLED.allowsMemberFeatures());
        assertNotNull(MemberAccessState.CANCELLED.refusalMessage());
    }

    @Test
    void otherStatusesAreUnchanged() {
        assertEquals(MemberAccessState.ACTIVE, MemberAccessState.of(false, null, "active"));
        assertEquals(MemberAccessState.SUSPENDED, MemberAccessState.of(true, null, "active"));
    }

    @Test
    void gymSwitcherShowsCancelled() {
        assertEquals("CANCELLED", GlobalMembershipService.statusOf("cancelled", null, false,
                LocalDateTime.now().plusDays(10), LocalDateTime.now()));
    }
}
