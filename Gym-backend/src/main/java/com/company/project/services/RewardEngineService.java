package com.company.project.services;

import com.company.project.entities.Member;
import com.company.project.entities.Referral;
import com.company.project.entities.ReferralCampaign;
import com.company.project.entities.ReferralReward;
import com.company.project.entities.ReferralRewardRule;
import com.company.project.entities.ReferralSettings;
import com.company.project.entities.RewardAuditLog;
import com.company.project.enums.RedemptionAction;
import com.company.project.enums.RewardAuditAction;
import com.company.project.enums.RewardMemberType;
import com.company.project.enums.RewardStatus;
import com.company.project.enums.RewardType;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReferralCampaignRepository;
import com.company.project.repositories.ReferralRepository;
import com.company.project.repositories.ReferralRewardRepository;
import com.company.project.repositories.ReferralRewardRuleRepository;
import com.company.project.repositories.ReferralSettingsRepository;
import com.company.project.repositories.RewardAuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

/**
 * RewardEngineService — the only place reward-generation logic lives (never in
 * a controller). Entry point is generateRewardsForReferral(), called by
 * ReferralService.markSuccessful() once a referral flips to "successful".
 *
 * For each side of the referral (referrer / referee) it walks the active
 * reward rules in priority order and executes the first matching rule. A rule
 * marked stackable=true does not stop the walk — evaluation continues to the
 * next rule, so a campaign can layer an extra reward on top of the standard
 * one ("Double Rewards Weekend") without any code change: just insert a
 * campaign + a stackable rule row. The default (stackable=false) preserves
 * "first matching rule wins" exactly as specified.
 */
@Service
@Transactional
public class RewardEngineService {

    private final ReferralRewardRuleRepository ruleRepository;
    private final ReferralRewardRepository rewardRepository;
    private final ReferralRepository referralRepository;
    private final ReferralSettingsRepository settingsRepository;
    private final ReferralCampaignRepository campaignRepository;
    private final MemberRepository memberRepository;
    private final RewardAuditLogRepository auditLogRepository;
    private final RewardRedemptionService redemptionService;
    private final NotificationService notificationService;

    public RewardEngineService(ReferralRewardRuleRepository ruleRepository,
                                ReferralRewardRepository rewardRepository,
                                ReferralRepository referralRepository,
                                ReferralSettingsRepository settingsRepository,
                                ReferralCampaignRepository campaignRepository,
                                MemberRepository memberRepository,
                                RewardAuditLogRepository auditLogRepository,
                                RewardRedemptionService redemptionService,
                                NotificationService notificationService) {
        this.ruleRepository = ruleRepository;
        this.rewardRepository = rewardRepository;
        this.referralRepository = referralRepository;
        this.settingsRepository = settingsRepository;
        this.campaignRepository = campaignRepository;
        this.memberRepository = memberRepository;
        this.auditLogRepository = auditLogRepository;
        this.redemptionService = redemptionService;
        this.notificationService = notificationService;
    }

    public void generateRewardsForReferral(Referral referral) {
        if (referral == null || !"successful".equals(referral.getStatus())) return;

        ReferralSettings settings = settingsRepository.findById(1L).orElse(null);
        if (settings != null && Boolean.FALSE.equals(settings.getProgramEnabled())) return;

        List<ReferralRewardRule> rules;
        if (referral.getRuleId() != null) {
            ReferralRewardRule explicitRule = ruleRepository.findById(referral.getRuleId()).orElse(null);
            if (explicitRule != null) {
                rules = java.util.List.of(explicitRule);
            } else {
                rules = ruleRepository.findByIsActiveTrueOrderByPriorityDesc();
            }
        } else {
            rules = ruleRepository.findByIsActiveTrueOrderByPriorityDesc();
        }
        if (rules.isEmpty()) return;

        String refereeMemberId = referral.getRefereeMemberId();
        if (refereeMemberId == null && referral.getRefereeEmail() != null) {
            Member m = memberRepository.findByEmail(referral.getRefereeEmail()).orElse(null);
            if (m != null) refereeMemberId = m.getMemberId();
        }
        if (refereeMemberId == null && referral.getRefereePhone() != null) {
            Member m = memberRepository.findByPhone(referral.getRefereePhone()).orElse(null);
            if (m != null) refereeMemberId = m.getMemberId();
        }

        generateForSide(referral, rules, RewardMemberType.REFERRER, referral.getReferrerMemberId());
        generateForSide(referral, rules, RewardMemberType.REFEREE, refereeMemberId);
    }

    private void generateForSide(Referral referral, List<ReferralRewardRule> rules,
                                  RewardMemberType memberType, String memberId) {
        if (memberId == null || memberId.isBlank()) return;

        // Ensure we have the actual business memberId (e.g., MBR-...)
        // in case the frontend sent the database ID by mistake.
        Member resolvedMember = memberRepository.findByMemberId(memberId).orElse(null);
        if (resolvedMember == null) {
            try {
                resolvedMember = memberRepository.findById(Long.parseLong(memberId)).orElse(null);
                if (resolvedMember != null) {
                    memberId = resolvedMember.getMemberId();
                }
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        
        final String finalMemberId = memberId;
        final Member finalMember = resolvedMember;

        for (ReferralRewardRule rule : rules) {
            if (!eligibleFor(rule, memberType)) continue;
            if (!passesValidation(rule, referral, memberType, finalMemberId, finalMember)) continue;

            createReward(referral, rule, memberType, finalMemberId);

            if (!Boolean.TRUE.equals(rule.getStackable())) {
                break; // exclusive match — first matching rule wins
            }
            // stackable — keep evaluating so a following rule can also fire
        }
    }

    private boolean eligibleFor(ReferralRewardRule rule, RewardMemberType memberType) {
        String eligibility = rule.getEligibility();
        if (eligibility == null) return false;
        if ("both".equalsIgnoreCase(eligibility)) return true;
        return memberType == RewardMemberType.REFERRER
                ? "referrer".equalsIgnoreCase(eligibility)
                : "referee".equalsIgnoreCase(eligibility);
    }

    private boolean passesValidation(ReferralRewardRule rule, Referral referral,
                                      RewardMemberType memberType, String memberId, Member member) {
        if (!withinCampaignWindow(rule)) return false;

        if (rule.getMinPurchaseAmount() != null) {
            if (referral.getPurchaseAmount() == null
                    || referral.getPurchaseAmount().compareTo(rule.getMinPurchaseAmount()) < 0) {
                return false;
            }
        }

        if (rule.getMinReferralCount() != null) {
            long count = referralRepository.countByReferrerMemberIdAndStatus(referral.getReferrerMemberId(), "successful");
            if (count < rule.getMinReferralCount()) return false;
        }

        if (rule.getMaxRewardsPerMember() != null) {
            long existing = rewardRepository.countByMemberIdAndRewardRuleId(memberId, rule.getId());
            if (existing >= rule.getMaxRewardsPerMember()) return false;
        }

        if (rewardRepository.existsByReferralIdAndRewardRuleIdAndMemberType(referral.getId(), rule.getId(), memberType)) {
            return false; // duplicate reward guard
        }

        if (rule.getTargetMembershipPlanId() != null) {
            if (referral.getMembershipPlanId() == null
                    || !referral.getMembershipPlanId().equals(rule.getTargetMembershipPlanId())) {
                return false;
            }
        }

        // Subscription requirement — the member must actually exist and not be expired.
        if (member == null) return false;
        if ("expired".equalsIgnoreCase(member.getMembershipStatus())) return false;

        return true;
    }

    private boolean withinCampaignWindow(ReferralRewardRule rule) {
        LocalDate today = LocalDate.now();

        if (rule.getCampaignId() != null) {
            ReferralCampaign campaign = campaignRepository.findById(rule.getCampaignId()).orElse(null);
            if (campaign == null) return false;
            if ("paused".equalsIgnoreCase(campaign.getStatus()) || "expired".equalsIgnoreCase(campaign.getStatus())) {
                return false;
            }
            if (campaign.getStartDate() != null && campaign.getStartDate().isAfter(today)) return false;
            if (campaign.getEndDate() != null && campaign.getEndDate().isBefore(today)) return false;
            return true;
        }

        if (rule.getCampaignStartDate() != null && rule.getCampaignStartDate().isAfter(today)) return false;
        if (rule.getCampaignEndDate() != null && rule.getCampaignEndDate().isBefore(today)) return false;
        return true;
    }

    private void createReward(Referral referral, ReferralRewardRule rule,
                               RewardMemberType memberType, String memberId) {
        ReferralReward reward = new ReferralReward();
        reward.setReferralId(referral.getId());
        reward.setRewardRuleId(rule.getId());
        reward.setMemberId(memberId);
        reward.setMemberType(memberType);
        reward.setRewardName(rule.getName());

        RewardType type = rule.getRewardType() != null ? rule.getRewardType() : inferLegacyType(rule.getType());
        reward.setRewardType(type);

        BigDecimal rewardValue = rule.getValue();
        if (rule.getId() != null && rule.getId().equals(referral.getRuleId()) && referral.getRewardAmount() != null) {
            rewardValue = referral.getRewardAmount();
        }
        reward.setRewardValue(rewardValue);
        reward.setCurrency(rule.getCurrency() != null ? rule.getCurrency() : "AED");
        reward.setRedemptionAction(rule.getRedemptionAction() != null ? rule.getRedemptionAction() : defaultActionFor(type));

        boolean approvalRequired = Boolean.TRUE.equals(rule.getRequiresApproval());
        reward.setApprovalRequired(approvalRequired);
        reward.setStatus(approvalRequired ? RewardStatus.PENDING : RewardStatus.AVAILABLE);

        LocalDateTime now = LocalDateTime.now();
        reward.setGeneratedDate(now);
        if (rule.getExpiryDays() != null) {
            reward.setExpiryDate(LocalDate.now().plusDays(rule.getExpiryDays()));
        }

        if (rule.getCampaignId() != null) {
            campaignRepository.findById(rule.getCampaignId()).ifPresent(c -> {
                reward.setCampaignId(c.getId());
                reward.setCampaignName(c.getName());
            });
        }

        ReferralReward saved = rewardRepository.save(reward);
        saved.setRewardCode("RWD-" + String.format("%010d", saved.getId()));
        saved = rewardRepository.save(saved);

        auditLogRepository.save(new RewardAuditLog(saved.getId(), RewardAuditAction.GENERATED, "SYSTEM",
                "Generated by rule '" + rule.getName() + "'" + (rule.getStackable() != null && rule.getStackable() ? " (stacked)" : "")));

        notifyRewardGenerated(saved);

        if (!approvalRequired) {
            redemptionService.autoProcessOnGeneration(saved);
        }
    }

    private RewardType inferLegacyType(String legacyType) {
        if (legacyType == null) return RewardType.WALLET_CREDIT;
        return switch (legacyType.toLowerCase()) {
            case "discount" -> RewardType.MEMBERSHIP_DISCOUNT;
            case "points" -> RewardType.LOYALTY_POINTS;
            case "free_session" -> RewardType.FREE_PT;
            default -> RewardType.WALLET_CREDIT; // "credit" and anything unrecognized
        };
    }

    private RedemptionAction defaultActionFor(RewardType type) {
        return switch (type) {
            case WALLET_CREDIT -> RedemptionAction.USE_DURING_PAYMENT;
            case MEMBERSHIP_EXTENSION -> RedemptionAction.EXTEND_MEMBERSHIP;
            case MEMBERSHIP_DISCOUNT -> RedemptionAction.USE_DURING_PAYMENT;
            case FREE_PT -> RedemptionAction.BOOK_PT;
            case FREE_CLASS -> RedemptionAction.BOOK_CLASS;
            case COUPON -> RedemptionAction.COPY_COUPON;
            case LOYALTY_POINTS -> RedemptionAction.USE_DURING_PAYMENT;
            case GIFT -> RedemptionAction.COLLECT_GIFT;
            case CASH -> RedemptionAction.REQUEST_CASH;
        };
    }

    private void notifyRewardGenerated(ReferralReward reward) {
        String title = "New Reward Generated";
        String message = reward.getRewardName() + " (" + reward.getRewardType() + ") generated for " + reward.getMemberId()
                + (Boolean.TRUE.equals(reward.getApprovalRequired()) ? " — awaiting approval." : " — now available.");
        String priority = Boolean.TRUE.equals(reward.getApprovalRequired()) ? "MEDIUM" : "LOW";

        notificationService.notifyRoles(List.of("ADMIN", "MANAGER"), title, message,
                "SUCCESS", priority, "REFERRALS", reward.getId(), "/reward-queue",
                "REWARD_GENERATED_" + reward.getId());

        memberRepository.findByMemberId(reward.getMemberId()).ifPresent(member -> {
            if (member.getUserId() != null) {
                notificationService.notifyUser(member.getUserId(), title, message,
                        "SUCCESS", priority, "REFERRALS", reward.getId(), "/my-rewards",
                        "REWARD_GENERATED_USER_" + reward.getId());
            }
        });
    }
}
