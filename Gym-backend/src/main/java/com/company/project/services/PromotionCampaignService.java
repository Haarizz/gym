package com.company.project.services;

import com.company.project.dto.ApplyAccessDaysRequestDTO;
import com.company.project.dto.ApplyAccessDaysResponseDTO;
import com.company.project.dto.EligibleMemberDTO;
import com.company.project.dto.PromotionCampaignRequestDTO;
import com.company.project.dto.PromotionCampaignResponseDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.PromotionAccessDaysAudit;
import com.company.project.entities.PromotionCampaign;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.PromotionAccessDaysAuditRepository;
import com.company.project.repositories.PromotionCampaignRepository;
import com.company.project.repositories.ReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PromotionCampaignService {

    private final PromotionCampaignRepository promotionRepository;
    private final MemberRepository memberRepository;
    private final MembershipPlanRepository membershipPlanRepository;
    private final ReceiptRepository receiptRepository;
    private final PromotionAccessDaysAuditRepository accessDaysAuditRepository;

    public PromotionCampaignService(PromotionCampaignRepository promotionRepository,
                                     MemberRepository memberRepository,
                                     MembershipPlanRepository membershipPlanRepository,
                                     ReceiptRepository receiptRepository,
                                     PromotionAccessDaysAuditRepository accessDaysAuditRepository) {
        this.promotionRepository = promotionRepository;
        this.memberRepository = memberRepository;
        this.membershipPlanRepository = membershipPlanRepository;
        this.receiptRepository = receiptRepository;
        this.accessDaysAuditRepository = accessDaysAuditRepository;
    }

    public List<PromotionCampaignResponseDTO> getPromotions(String status) {
        List<PromotionCampaign> items = (status != null && !status.isBlank())
                ? promotionRepository.findByStatusOrderByCreatedAtDesc(status)
                : promotionRepository.findAllByOrderByCreatedAtDesc();
        return items.stream().map(PromotionCampaignResponseDTO::fromEntity).collect(Collectors.toList());
    }

    public PromotionCampaignResponseDTO getPromotionById(Long id) {
        PromotionCampaign promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found: " + id));
        return PromotionCampaignResponseDTO.fromEntity(promotion);
    }

    public PromotionCampaignResponseDTO createPromotion(PromotionCampaignRequestDTO req) {
        PromotionCampaign promotion = new PromotionCampaign();
        applyRequest(promotion, req, true);
        return PromotionCampaignResponseDTO.fromEntity(promotionRepository.save(promotion));
    }

    public PromotionCampaignResponseDTO updatePromotion(Long id, PromotionCampaignRequestDTO req) {
        PromotionCampaign promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found: " + id));
        applyRequest(promotion, req, false);
        return PromotionCampaignResponseDTO.fromEntity(promotionRepository.save(promotion));
    }

    public void deletePromotion(Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new EntityNotFoundException("Promotion not found: " + id);
        }
        promotionRepository.deleteById(id);
    }

    public PromotionCampaignResponseDTO duplicatePromotion(Long id) {
        PromotionCampaign original = promotionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found: " + id));

        PromotionCampaign copy = new PromotionCampaign();
        copy.setName(original.getName() + " (Copy)");
        copy.setType(original.getType());
        copy.setStatus("draft");
        copy.setDescription(original.getDescription());
        copy.setStartDate(original.getStartDate());
        copy.setEndDate(original.getEndDate());
        copy.setDiscountType(original.getDiscountType());
        copy.setDiscountValue(original.getDiscountValue());
        copy.setMinimumPurchase(original.getMinimumPurchase());
        copy.setMaximumDiscount(original.getMaximumDiscount());
        copy.setUsageLimit(original.getUsageLimit());
        copy.setUsageCount(0);
        copy.setUsageLimitPerMember(original.getUsageLimitPerMember());
        copy.setCode(original.getCode());
        copy.setApplicablePlans(original.getApplicablePlans());
        copy.setApplicableServices(original.getApplicableServices());
        copy.setTargetAudience(original.getTargetAudience());
        copy.setSpecificMembers(original.getSpecificMembers());
        copy.setChannels(original.getChannels());
        copy.setAutoApply(original.isAutoApply());
        copy.setStackable(original.isStackable());
        copy.setPriority(original.getPriority());
        copy.setCategory(original.getCategory());
        copy.setTags(original.getTags());
        copy.setTotalRevenue(original.getTotalRevenue());
        copy.setTotalSavings(original.getTotalSavings());
        copy.setConversionRate(original.getConversionRate());
        copy.setClickCount(original.getClickCount());
        copy.setRedemptionRate(original.getRedemptionRate());
        copy.setAverageOrderValue(original.getAverageOrderValue());
        copy.setImage(original.getImage());
        copy.setTermsAndConditions(original.getTermsAndConditions());
        copy.setPublic(original.isPublic());
        copy.setPolicyRulesJson(original.getPolicyRulesJson());
        copy.setPolicyConfigJson(original.getPolicyConfigJson());
        copy.setCreatedBy(original.getCreatedBy());

        return PromotionCampaignResponseDTO.fromEntity(promotionRepository.save(copy));
    }

    public List<PromotionCampaignResponseDTO> bulkAction(String action, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return new ArrayList<>();

        List<PromotionCampaign> items = promotionRepository.findAllById(ids);
        if (items.isEmpty()) return new ArrayList<>();

        switch (action.toLowerCase()) {
            case "activate":
                items.forEach(p -> p.setStatus("active"));
                break;
            case "pause":
            case "deactivate":
                items.forEach(p -> p.setStatus("paused"));
                break;
            case "delete":
                promotionRepository.deleteAll(items);
                return new ArrayList<>();
            case "duplicate":
                List<PromotionCampaignResponseDTO> copies = new ArrayList<>();
                for (PromotionCampaign p : items) {
                    copies.add(duplicatePromotion(p.getId()));
                }
                return copies;
            default:
                return items.stream().map(PromotionCampaignResponseDTO::fromEntity).collect(Collectors.toList());
        }

        return promotionRepository.saveAll(items).stream()
                .map(PromotionCampaignResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    // ── Status auto-transition ────────────────────────────────────────────────
    // Called by NotificationScheduler. Status is otherwise purely user/API-set,
    // so a "scheduled" promotion never flips to "active" when its start date
    // arrives, and nothing ever flips to "expired" when the end date passes.
    public void autoTransitionStatuses() {
        LocalDate today = LocalDate.now();

        List<PromotionCampaign> candidates = new ArrayList<>();
        candidates.addAll(promotionRepository.findByStatusOrderByCreatedAtDesc("scheduled"));
        candidates.addAll(promotionRepository.findByStatusOrderByCreatedAtDesc("active"));
        candidates.addAll(promotionRepository.findByStatusOrderByCreatedAtDesc("paused"));

        List<PromotionCampaign> changed = new ArrayList<>();
        for (PromotionCampaign p : candidates) {
            if (p.getEndDate() != null && p.getEndDate().isBefore(today)) {
                p.setStatus("expired");
                changed.add(p);
            } else if ("scheduled".equals(p.getStatus()) && p.getStartDate() != null && !p.getStartDate().isAfter(today)) {
                p.setStatus("active");
                changed.add(p);
            }
        }
        if (!changed.isEmpty()) promotionRepository.saveAll(changed);
    }

    // Helpers
    private void applyRequest(PromotionCampaign promotion, PromotionCampaignRequestDTO req, boolean isCreate) {
        if (req.getName() != null) promotion.setName(req.getName());
        if (req.getType() != null) promotion.setType(req.getType());
        if (req.getStatus() != null) promotion.setStatus(req.getStatus());
        if (req.getDescription() != null) promotion.setDescription(req.getDescription());
        if (req.getStartDate() != null) promotion.setStartDate(LocalDate.parse(req.getStartDate()));
        if (req.getEndDate() != null) promotion.setEndDate(LocalDate.parse(req.getEndDate()));

        if (req.getDiscountType() != null) promotion.setDiscountType(req.getDiscountType());
        if (req.getDiscountValue() != null) promotion.setDiscountValue(req.getDiscountValue());
        if (req.getMinimumPurchase() != null) promotion.setMinimumPurchase(req.getMinimumPurchase());
        if (req.getMaximumDiscount() != null) promotion.setMaximumDiscount(req.getMaximumDiscount());
        if (req.getUsageLimit() != null) promotion.setUsageLimit(req.getUsageLimit());
        if (req.getUsageCount() != null) promotion.setUsageCount(req.getUsageCount());
        if (req.getUsageLimitPerMember() != null) promotion.setUsageLimitPerMember(req.getUsageLimitPerMember());
        if (req.getCode() != null) promotion.setCode(req.getCode());

        if (req.getApplicablePlans() != null) promotion.setApplicablePlans(req.getApplicablePlans());
        if (req.getApplicableServices() != null) promotion.setApplicableServices(req.getApplicableServices());
        if (req.getTargetAudience() != null) promotion.setTargetAudience(req.getTargetAudience());
        if (req.getSpecificMembers() != null) promotion.setSpecificMembers(req.getSpecificMembers());
        if (req.getChannels() != null) promotion.setChannels(req.getChannels());
        if (req.getAutoApply() != null) promotion.setAutoApply(req.getAutoApply());
        if (req.getStackable() != null) promotion.setStackable(req.getStackable());
        if (req.getPriority() != null) promotion.setPriority(req.getPriority());
        if (req.getCategory() != null) promotion.setCategory(req.getCategory());
        if (req.getTags() != null) promotion.setTags(req.getTags());

        if (req.getTotalRevenue() != null) promotion.setTotalRevenue(req.getTotalRevenue());
        if (req.getTotalSavings() != null) promotion.setTotalSavings(req.getTotalSavings());
        if (req.getConversionRate() != null) promotion.setConversionRate(req.getConversionRate());
        if (req.getClickCount() != null) promotion.setClickCount(req.getClickCount());
        if (req.getRedemptionRate() != null) promotion.setRedemptionRate(req.getRedemptionRate());
        if (req.getAverageOrderValue() != null) promotion.setAverageOrderValue(req.getAverageOrderValue());

        if (req.getImage() != null) promotion.setImage(req.getImage());
        if (req.getTermsAndConditions() != null) promotion.setTermsAndConditions(req.getTermsAndConditions());
        if (req.getIsPublic() != null) promotion.setPublic(req.getIsPublic());

        if (req.getPolicyRulesJson() != null) promotion.setPolicyRulesJson(req.getPolicyRulesJson());
        if (req.getPolicyConfigJson() != null) promotion.setPolicyConfigJson(req.getPolicyConfigJson());

        if (req.getCreatedBy() != null) promotion.setCreatedBy(req.getCreatedBy());

        if (isCreate && promotion.getUsageCount() == null) {
            promotion.setUsageCount(0);
        }
    }

    /**
     * Validate a promotion by its voucher code.
     * Checks: exists, status is active, not expired, usage limit not exceeded.
     */
    @Transactional(readOnly = true)
    public PromotionCampaignResponseDTO validateByCode(String code) {
        PromotionCampaign promotion = promotionRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new EntityNotFoundException("Invalid promotion code"));

        if (!"active".equalsIgnoreCase(promotion.getStatus())) {
            throw new IllegalStateException("Promotion is not active");
        }

        if (promotion.getEndDate() != null && promotion.getEndDate().isBefore(LocalDate.now())) {
            throw new IllegalStateException("Promotion has expired");
        }

        if (promotion.getStartDate() != null && promotion.getStartDate().isAfter(LocalDate.now())) {
            throw new IllegalStateException("Promotion has not started yet");
        }

        if (promotion.getUsageLimit() != null && promotion.getUsageCount() != null
                && promotion.getUsageCount() >= promotion.getUsageLimit()) {
            throw new IllegalStateException("Promotion usage limit has been reached");
        }

        return PromotionCampaignResponseDTO.fromEntity(promotion);
    }

    /**
     * Increment the usage count when a promotion is successfully redeemed.
     */
    public PromotionCampaignResponseDTO redeemPromotion(Long id, BigDecimal revenue, BigDecimal savings) {
        PromotionCampaign promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found: " + id));

        int currentCount = promotion.getUsageCount() != null ? promotion.getUsageCount() : 0;
        promotion.setUsageCount(currentCount + 1);

        if (revenue != null) {
            BigDecimal currentRev = promotion.getTotalRevenue() != null ? promotion.getTotalRevenue() : BigDecimal.ZERO;
            promotion.setTotalRevenue(currentRev.add(revenue));
        }

        if (savings != null) {
            BigDecimal currentSav = promotion.getTotalSavings() != null ? promotion.getTotalSavings() : BigDecimal.ZERO;
            promotion.setTotalSavings(currentSav.add(savings));
        }

        int newCount = promotion.getUsageCount();
        // Average order value: real revenue per redemption, not tracked anywhere else.
        if (promotion.getTotalRevenue() != null && newCount > 0) {
            promotion.setAverageOrderValue(
                    promotion.getTotalRevenue().divide(BigDecimal.valueOf(newCount), 2, RoundingMode.HALF_UP));
        }
        // Redemption rate: only meaningful against a known ceiling (usageLimit). With no cap
        // set, there's no real denominator to compute a rate against, so it's left at 0 rather
        // than faked — clickCount/conversionRate stay 0 for the same reason (no click-tracking
        // surface exists yet, e.g. a public promo link/pixel).
        if (promotion.getUsageLimit() != null && promotion.getUsageLimit() > 0) {
            promotion.setRedemptionRate(
                    BigDecimal.valueOf(newCount)
                            .divide(BigDecimal.valueOf(promotion.getUsageLimit()), 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100))
                            .setScale(1, RoundingMode.HALF_UP));
        }

        return PromotionCampaignResponseDTO.fromEntity(promotionRepository.save(promotion));
    }

    // ── Promotional Access Days ───────────────────────────────────────────────

    /**
     * Real member data shaped for the frontend's policyRuleEngine.ts Member type,
     * so the eligibility preview evaluates actual members instead of hardcoded
     * sample data.
     */
    @Transactional(readOnly = true)
    public List<EligibleMemberDTO> getEligibilityMembers() {
        List<Member> members = memberRepository.findAll();
        List<EligibleMemberDTO> result = new ArrayList<>();

        for (Member m : members) {
            EligibleMemberDTO dto = new EligibleMemberDTO();
            dto.setId(String.valueOf(m.getId()));
            dto.setName(m.getName());
            dto.setEmail(m.getEmail());
            String joined = m.getJoinDate() != null ? m.getJoinDate().toLocalDate().toString() : null;
            dto.setJoinedAt(joined);
            dto.setPurchaseDate(joined);

            // "individual / family / corporate" (what the eligibility rule engine's
            // membership_type condition expects) lives on the plan's planType, not on
            // Member.membershipType (which is the Basic/Standard/Premium/VIP tier).
            if (m.getMembershipPlan() != null) {
                membershipPlanRepository.findByName(m.getMembershipPlan()).ifPresent(plan -> {
                    int months = planDurationInMonths(plan);
                    dto.setCurrentPlan(new EligibleMemberDTO.CurrentPlan(m.getMembershipPlan(), months));
                    if (plan.getPlanType() != null) {
                        dto.setMembershipType(plan.getPlanType().toLowerCase());
                    }
                });
            }

            long renewals = m.getId() != null
                    ? receiptRepository.countByMemberDbIdAndTransactionType(m.getId(), "Renewal")
                    : 0;
            dto.setRenewalCount((int) renewals);

            result.add(dto);
        }
        return result;
    }

    private int planDurationInMonths(MembershipPlan plan) {
        int val;
        try {
            val = Integer.parseInt(plan.getDurationValue());
        } catch (Exception e) {
            return 0;
        }
        String type = plan.getDurationType();
        if (type == null) return val;
        switch (type.toLowerCase()) {
            case "monthly":
            case "months":
                return val;
            case "annual":
            case "annually":
            case "yearly":
            case "years":
                return val * 12;
            case "quarterly":
                return val * 3;
            case "weekly":
            case "weeks":
                return 0;
            default:
                return val;
        }
    }

    /**
     * Actually grants the matched members their promotional access days by
     * extending their membership expiry, instead of the frontend's previous
     * simulate-and-toast behavior. Idempotent per (promotion, member) via
     * PromotionAccessDaysAudit's unique constraint — re-applying the same
     * promotion never double-grants a member who was already applied.
     */
    public ApplyAccessDaysResponseDTO applyAccessDays(ApplyAccessDaysRequestDTO req) {
        if (req.getPromotionId() == null) {
            throw new IllegalArgumentException("promotionId is required");
        }
        PromotionCampaign promotion = promotionRepository.findById(req.getPromotionId())
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found: " + req.getPromotionId()));

        List<ApplyAccessDaysRequestDTO.Match> matches = req.getMatches() != null ? req.getMatches() : List.of();
        LocalDateTime now = LocalDateTime.now();

        int appliedCount = 0;
        int totalDays = 0;
        List<String> skipped = new ArrayList<>();

        for (ApplyAccessDaysRequestDTO.Match match : matches) {
            Long memberId;
            try {
                memberId = match.getMemberId() != null ? Long.valueOf(match.getMemberId()) : null;
            } catch (NumberFormatException e) {
                memberId = null;
            }

            if (memberId == null || match.getRewardDays() == null || match.getRewardDays() <= 0
                    || accessDaysAuditRepository.existsByPromotionIdAndMemberId(promotion.getId(), memberId)) {
                skipped.add(match.getMemberId());
                continue;
            }

            Member member = memberRepository.findById(memberId).orElse(null);
            if (member == null) {
                skipped.add(match.getMemberId());
                continue;
            }

            LocalDateTime base = member.getExpiryDate() != null ? member.getExpiryDate() : now;
            LocalDateTime newExpiry = base.plusDays(match.getRewardDays());
            member.setExpiryDate(newExpiry);
            member.setMembershipEndDate(newExpiry);
            memberRepository.save(member);

            PromotionAccessDaysAudit audit = new PromotionAccessDaysAudit();
            audit.setPromotionId(promotion.getId());
            audit.setMemberId(memberId);
            audit.setRuleId(match.getRuleId());
            audit.setAppliedDays(match.getRewardDays());
            accessDaysAuditRepository.save(audit);

            appliedCount++;
            totalDays += match.getRewardDays();
        }

        return new ApplyAccessDaysResponseDTO(true, appliedCount, skipped.size(), totalDays, now, skipped);
    }
}

