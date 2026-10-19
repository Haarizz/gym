package com.company.project.services;

import com.company.project.entities.Member;
import com.company.project.entities.PromotionCampaign;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.services.PromotionAudience.Buyer;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PromotionAudienceTest {

    private static PromotionCampaign promo(String audience, String... specificMembers) {
        PromotionCampaign p = new PromotionCampaign();
        p.setTargetAudience(audience);
        p.setSpecificMembers(List.of(specificMembers));
        return p;
    }

    private static Member member(long id, LocalDateTime joined, String tier) {
        Member m = new Member();
        m.setId(id);
        m.setJoinDate(joined);
        m.setMembershipType(tier);
        return m;
    }

    private static final Member OLD = member(7, LocalDateTime.now().minusDays(90), "Standard");
    private static final Member RECENT = member(8, LocalDateTime.now().minusDays(5), "VIP");

    @Test
    void allIsOpenToEveryoneIncludingWalkIns() {
        assertTrue(PromotionAudience.allows(promo("all"), Buyer.of(null)));
        assertTrue(PromotionAudience.allows(promo(null), Buyer.of(null)));
        assertTrue(PromotionAudience.allows(promo("all"), Buyer.of(OLD)));
    }

    @Test
    void specificOnlyAllowsPickedMembers() {
        PromotionCampaign p = promo("specific", "7");
        assertTrue(PromotionAudience.allows(p, Buyer.of(OLD)));
        assertFalse(PromotionAudience.allows(p, Buyer.of(RECENT)));
        assertFalse(PromotionAudience.allows(p, Buyer.of(null)));
        assertFalse(PromotionAudience.allows(p, Buyer.JOINING));
        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> PromotionAudience.require(p, Buyer.of(RECENT)));
        assertEquals("This promotion is only for selected members.", e.getMessage());
    }

    @Test
    void newMembersAreRecentJoinersOrPeopleSigningUp() {
        PromotionCampaign p = promo("new-members");
        assertTrue(PromotionAudience.allows(p, Buyer.of(RECENT)));
        assertTrue(PromotionAudience.allows(p, Buyer.JOINING));
        assertFalse(PromotionAudience.allows(p, Buyer.of(OLD)));
        assertFalse(PromotionAudience.allows(p, Buyer.of(null)));
    }

    @Test
    void newMemberFallsBackToCreationTimeWithoutJoinDate() {
        Member justCreated = member(9, null, null);
        justCreated.setCreatedAt(LocalDateTime.now());
        assertTrue(PromotionAudience.allows(promo("new-members"), Buyer.of(justCreated)));
    }

    @Test
    void existingMembersJoinedBeforeTheNewMemberWindow() {
        PromotionCampaign p = promo("existing-members");
        assertTrue(PromotionAudience.allows(p, Buyer.of(OLD)));
        assertFalse(PromotionAudience.allows(p, Buyer.of(RECENT)));
        assertFalse(PromotionAudience.allows(p, Buyer.JOINING));
    }

    @Test
    void vipIsTheMembershipTier() {
        PromotionCampaign p = promo("vip");
        assertTrue(PromotionAudience.allows(p, Buyer.of(RECENT)));
        assertFalse(PromotionAudience.allows(p, Buyer.of(OLD)));
        assertFalse(PromotionAudience.allows(p, Buyer.of(null)));
    }

    @Test
    void pickedMembersRankAboveGroupsAboveEveryone() {
        assertEquals(0, PromotionAudience.specificity(promo("specific", "7")));
        assertEquals(1, PromotionAudience.specificity(promo("vip")));
        assertEquals(1, PromotionAudience.specificity(promo("new-members")));
        assertEquals(2, PromotionAudience.specificity(promo("all")));
        assertEquals(2, PromotionAudience.specificity(promo(null)));
    }

    @Test
    void unknownAudienceIsNotRestricted() {
        assertDoesNotThrow(() -> PromotionAudience.require(promo("students"), Buyer.of(null)));
    }
}
