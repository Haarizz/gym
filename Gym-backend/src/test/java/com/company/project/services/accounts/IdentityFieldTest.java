package com.company.project.services.accounts;

import com.company.project.dto.MemberRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.UserProfile;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class IdentityFieldTest {

    @Test
    void staff_edit_of_either_emergency_pair_counts_as_the_emergency_contact() {
        MemberRequestDTO r = new MemberRequestDTO();
        r.setEmergencyContactName("Ada");
        r.setMembershipPlan("Gold");

        Set<IdentityField> changed = IdentityField.changedBy(r);

        assertEquals(EnumSet.of(IdentityField.EMERGENCY_CONTACT), changed, "plan is gym-only, never copied");
    }

    @Test
    void applying_a_change_keeps_both_emergency_pairs_in_step() {
        Member m = new Member();
        IdentityField.apply(Map.of(IdentityField.EMERGENCY_PHONE, "+100"), EnumSet.of(IdentityField.EMERGENCY_PHONE), m);
        assertEquals("+100", m.getEmergencyPhone());
        assertEquals("+100", m.getEmergencyContactPhone());
    }

    @Test
    void name_and_phone_are_never_blanked_but_other_fields_can_be_cleared() {
        Member m = new Member();
        m.setName("Grace");
        m.setPhone("+1");
        m.setAllergies("Peanuts");
        Map<IdentityField, Object> blanks = new java.util.EnumMap<>(IdentityField.class);
        blanks.put(IdentityField.FULL_NAME, " ");
        blanks.put(IdentityField.PHONE, null);
        blanks.put(IdentityField.ALLERGIES, "");

        IdentityField.apply(blanks, EnumSet.of(IdentityField.FULL_NAME, IdentityField.PHONE, IdentityField.ALLERGIES), m);

        assertEquals("Grace", m.getName());
        assertEquals("+1", m.getPhone());
        assertNull(m.getAllergies());
    }

    @Test
    void filling_gaps_never_overwrites() {
        Member m = new Member();
        m.setName("Gym spelling");
        Map<IdentityField, Object> account = Map.of(
                IdentityField.FULL_NAME, "Account spelling",
                IdentityField.DATE_OF_BIRTH, LocalDate.of(1990, 1, 5));

        assertTrue(IdentityField.fillGaps(account, m));
        assertEquals("Gym spelling", m.getName());
        assertEquals(LocalDate.of(1990, 1, 5), m.getDateOfBirth());
    }

    @Test
    void member_to_profile_copies_only_filled_values() {
        Member m = new Member();
        m.setName("Grace");
        m.setChronicIllnesses("Asthma");
        UserProfile p = new UserProfile();
        p.setPhone("+1");

        IdentityField.applyFilled(IdentityField.valuesOf(m), p);

        assertEquals("Grace", p.getFullName());
        assertEquals("Asthma", p.getChronicIllnesses());
        assertEquals("+1", p.getPhone(), "a blank on the gym's record leaves the profile alone");
    }
}
