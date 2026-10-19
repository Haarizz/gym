package com.company.project.services;

import com.company.project.dto.PromotionCampaignResponseDTO;
import com.company.project.entities.Member;
import com.company.project.entities.PromotionCampaign;
import com.company.project.exceptions.BusinessRuleViolationException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Who a promotion's target audience lets use it. "all" (or no audience) is everyone;
 * "specific" is the members picked on the promotion (their database ids); "new-members"
 * joined within the last {@value #NEW_MEMBER_DAYS} days or are signing up now;
 * "existing-members" joined before that; "vip" is the VIP membership tier.
 * Anything but "all" needs a member, so a walk-in can't use it.
 */
public final class PromotionAudience {

    public static final int NEW_MEMBER_DAYS = 30;

    /**
     * The person a promotion is being checked for: an existing member, nobody (a walk-in),
     * or someone signing up, who has no member record yet and counts as a new member.
     */
    public record Buyer(Member member, boolean joining) {
        public static final Buyer JOINING = new Buyer(null, true);

        public static Buyer of(Member member) { return new Buyer(member, false); }
    }

    private PromotionAudience() {}

    public static void require(PromotionCampaign p, Buyer buyer) {
        require(p.getTargetAudience(), p.getSpecificMembers(), buyer);
    }

    public static void require(PromotionCampaignResponseDTO p, Buyer buyer) {
        require(p.getTargetAudience(), p.getSpecificMembers(), buyer);
    }

    public static boolean allows(PromotionCampaign p, Buyer buyer) {
        return rejection(p.getTargetAudience(), p.getSpecificMembers(), buyer) == null;
    }

    /** How narrowly the promotion is targeted: 0 picked members, 1 a member group (new/existing/VIP), 2 everyone. */
    public static int specificity(PromotionCampaign p) {
        String a = p.getTargetAudience() == null ? "" : p.getTargetAudience().trim().toLowerCase();
        return switch (a) {
            case "specific" -> 0;
            case "new-members", "existing-members", "vip" -> 1;
            default -> 2;
        };
    }

    private static void require(String audience, List<String> specificMembers, Buyer buyer) {
        String reason = rejection(audience, specificMembers, buyer);
        if (reason != null) throw new BusinessRuleViolationException(reason);
    }

    /** Why `buyer` can't use the promotion, or null when they can. */
    private static String rejection(String audience, List<String> specificMembers, Buyer buyer) {
        String a = audience == null ? "" : audience.trim().toLowerCase();
        Member m = buyer.member();
        return switch (a) {
            case "specific" -> m != null && specificMembers != null && specificMembers.contains(String.valueOf(m.getId()))
                    ? null : "This promotion is only for selected members.";
            case "new-members" -> buyer.joining() || (m != null && isNew(m))
                    ? null : "This promotion is only for new members.";
            case "existing-members" -> m != null && !isNew(m)
                    ? null : "This promotion is only for existing members.";
            case "vip" -> m != null && "vip".equalsIgnoreCase(m.getMembershipType())
                    ? null : "This promotion is only for VIP members.";
            // "all", blank, or a value this version doesn't know: no restriction
            default -> null;
        };
    }

    /** Join date, else the record's creation (a member created moments ago at signup may have no join date yet). */
    private static boolean isNew(Member m) {
        LocalDateTime joined = m.getJoinDate() != null ? m.getJoinDate() : m.getCreatedAt();
        return joined == null || joined.isAfter(LocalDateTime.now().minusDays(NEW_MEMBER_DAYS));
    }
}
