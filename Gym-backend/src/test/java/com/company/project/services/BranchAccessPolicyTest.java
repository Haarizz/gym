package com.company.project.services;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class BranchAccessPolicyTest {

    @Test
    void mixedOrUnsetAdmitsEveryone() {
        for (String g : new String[] { "male", "FEMALE", "transgender", "other", "", null }) {
            assertTrue(BranchAccessPolicy.isAllowed("Mixed", g));
            assertTrue(BranchAccessPolicy.isAllowed((String) null, g));
            assertTrue(BranchAccessPolicy.isAllowed("", g));
        }
    }

    @Test
    void ladiesOnlyAdmitsFemaleOnly() {
        assertTrue(BranchAccessPolicy.isAllowed("Ladies Only", "female"));
        assertTrue(BranchAccessPolicy.isAllowed("Ladies Only", "FEMALE"));
        assertFalse(BranchAccessPolicy.isAllowed("Ladies Only", "male"));
        assertFalse(BranchAccessPolicy.isAllowed("Ladies Only", "transgender"));
        assertFalse(BranchAccessPolicy.isAllowed("Ladies Only", "OTHER"));
        assertFalse(BranchAccessPolicy.isAllowed("Ladies Only", null));
    }

    @Test
    void menOnlyAdmitsMaleOnly() {
        assertTrue(BranchAccessPolicy.isAllowed("Men Only", "MALE"));
        assertFalse(BranchAccessPolicy.isAllowed("Men Only", "female"));
        assertFalse(BranchAccessPolicy.isAllowed("Men Only", "other"));
        assertFalse(BranchAccessPolicy.isAllowed("Men Only", ""));
    }

    @Test
    void womenOnlySpellingIsNotReadAsMenOnly() {
        assertEquals(BranchAccessPolicy.Access.LADIES_ONLY, BranchAccessPolicy.access("Women Only"));
        assertEquals(BranchAccessPolicy.Access.MEN_ONLY, BranchAccessPolicy.access("Men Only"));
    }
}
