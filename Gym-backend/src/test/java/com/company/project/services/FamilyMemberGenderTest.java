package com.company.project.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Couple / family members: gender implied by the relationship, and the ladies-only rule on it. */
class FamilyMemberGenderTest {

    @Test
    void relationshipImpliesGender() {
        assertEquals("female", MemberService.genderFromRelationship("Wife"));
        assertEquals("female", MemberService.genderFromRelationship(" daughter "));
        assertEquals("male", MemberService.genderFromRelationship("Husband"));
        assertEquals("male", MemberService.genderFromRelationship("SON"));
        assertNull(MemberService.genderFromRelationship("Other"));
        assertNull(MemberService.genderFromRelationship(null));
    }

    @Test
    void ladiesOnlyBranchTakesOnlyFemaleFamilyMembers() {
        assertTrue(BranchAccessPolicy.isAllowed("Ladies Only", MemberService.genderFromRelationship("Wife")));
        assertFalse(BranchAccessPolicy.isAllowed("Ladies Only", MemberService.genderFromRelationship("Husband")));
        assertFalse(BranchAccessPolicy.isAllowed("Ladies Only", "transgender"));
        assertTrue(BranchAccessPolicy.isAllowed("Mixed", MemberService.genderFromRelationship("Husband")));
    }
}
