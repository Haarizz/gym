package com.company.project.entities;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MembershipPlanDayPassTest {

    private static MembershipPlan plan(String planType, String durationType, String durationValue) {
        MembershipPlan p = new MembershipPlan();
        p.setPlanType(planType);
        p.setDurationType(durationType);
        p.setDurationValue(durationValue);
        return p;
    }

    @Test
    void walkInPlansAreDayPasses() {
        assertTrue(plan("Walk-In", "Weekly", "1").isDayPass());
    }

    @Test
    void aOneDayPlanIsADayPass() {
        assertTrue(plan("Individual", "Daily", "1").isDayPass());
    }

    @Test
    void longerPlansAreNot() {
        assertFalse(plan("Individual", "Daily", "30").isDayPass());
        assertFalse(plan("Individual", "Monthly", "1").isDayPass());
        assertFalse(plan("Family", "Annual", "1").isDayPass());
    }
}
