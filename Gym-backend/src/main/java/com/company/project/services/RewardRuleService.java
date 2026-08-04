package com.company.project.services;

import com.company.project.dto.RewardRuleRequestDTO;
import com.company.project.dto.RewardRuleResponseDTO;
import com.company.project.entities.ReferralCampaign;
import com.company.project.entities.ReferralRewardRule;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ReferralCampaignRepository;
import com.company.project.repositories.ReferralRewardRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Dedicated Reward Rules page backing service. Operates on the same
 * ReferralRewardRuleRepository as ReferralService's legacy /api/referrals/rules
 * endpoints (kept for backward compatibility) — this is the canonical CRUD
 * surface going forward, at /api/reward-rules.
 */
@Service
@Transactional
public class RewardRuleService {

    private final ReferralRewardRuleRepository ruleRepository;
    private final ReferralCampaignRepository campaignRepository;

    public RewardRuleService(ReferralRewardRuleRepository ruleRepository,
                              ReferralCampaignRepository campaignRepository) {
        this.ruleRepository = ruleRepository;
        this.campaignRepository = campaignRepository;
    }

    @Transactional(readOnly = true)
    public List<RewardRuleResponseDTO> getAll() {
        return ruleRepository.findAll().stream()
                .sorted((a, b) -> Integer.compare(
                        b.getPriority() != null ? b.getPriority() : 0,
                        a.getPriority() != null ? a.getPriority() : 0))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public RewardRuleResponseDTO create(RewardRuleRequestDTO req) {
        ReferralRewardRule rule = new ReferralRewardRule();
        applyRequest(req, rule);
        return toDTO(ruleRepository.save(rule));
    }

    public RewardRuleResponseDTO update(Long id, RewardRuleRequestDTO req) {
        ReferralRewardRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reward rule not found: " + id));
        applyRequest(req, rule);
        return toDTO(ruleRepository.save(rule));
    }

    public void delete(Long id) {
        if (!ruleRepository.existsById(id)) {
            throw new EntityNotFoundException("Reward rule not found: " + id);
        }
        ruleRepository.deleteById(id);
    }

    public RewardRuleResponseDTO toggle(Long id) {
        ReferralRewardRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reward rule not found: " + id));
        rule.setIsActive(!Boolean.TRUE.equals(rule.getIsActive()));
        return toDTO(ruleRepository.save(rule));
    }

    public RewardRuleResponseDTO duplicate(Long id) {
        ReferralRewardRule original = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reward rule not found: " + id));

        ReferralRewardRule copy = new ReferralRewardRule();
        copy.setName(original.getName() + " (Copy)");
        copy.setType(original.getType());
        copy.setValue(original.getValue());
        copy.setUnit(original.getUnit());
        copy.setEligibility(original.getEligibility());
        copy.setConditionTrigger(original.getConditionTrigger());
        copy.setIsActive(false); // duplicates start disabled until reviewed
        copy.setExpiryDays(original.getExpiryDays());
        copy.setRewardType(original.getRewardType());
        copy.setRedemptionAction(original.getRedemptionAction());
        copy.setCurrency(original.getCurrency());
        copy.setPriority(original.getPriority());
        copy.setStackable(original.getStackable());
        copy.setRequiresApproval(original.getRequiresApproval());
        copy.setCampaignId(original.getCampaignId());
        copy.setCampaignStartDate(original.getCampaignStartDate());
        copy.setCampaignEndDate(original.getCampaignEndDate());
        copy.setTargetMembershipPlanId(original.getTargetMembershipPlanId());
        copy.setMinPurchaseAmount(original.getMinPurchaseAmount());
        copy.setMinReferralCount(original.getMinReferralCount());
        copy.setMaxRewardsPerMember(original.getMaxRewardsPerMember());

        return toDTO(ruleRepository.save(copy));
    }

    private void applyRequest(RewardRuleRequestDTO req, ReferralRewardRule rule) {
        if (req.getName() != null) rule.setName(req.getName());
        if (req.getType() != null) rule.setType(req.getType());
        if (req.getValue() != null) rule.setValue(req.getValue());
        if (req.getUnit() != null) rule.setUnit(req.getUnit());
        if (req.getEligibility() != null) rule.setEligibility(req.getEligibility());
        if (req.getConditionTrigger() != null) rule.setConditionTrigger(req.getConditionTrigger());
        if (req.getIsActive() != null) rule.setIsActive(req.getIsActive());
        if (req.getExpiryDays() != null) rule.setExpiryDays(req.getExpiryDays());
        if (req.getRewardType() != null) rule.setRewardType(req.getRewardType());
        if (req.getRedemptionAction() != null) rule.setRedemptionAction(req.getRedemptionAction());
        if (req.getCurrency() != null) rule.setCurrency(req.getCurrency());
        if (req.getPriority() != null) rule.setPriority(req.getPriority());
        if (req.getStackable() != null) rule.setStackable(req.getStackable());
        if (req.getRequiresApproval() != null) rule.setRequiresApproval(req.getRequiresApproval());
        if (req.getCampaignId() != null) rule.setCampaignId(req.getCampaignId());
        if (req.getCampaignStartDate() != null) rule.setCampaignStartDate(req.getCampaignStartDate());
        if (req.getCampaignEndDate() != null) rule.setCampaignEndDate(req.getCampaignEndDate());
        if (req.getTargetMembershipPlanId() != null) rule.setTargetMembershipPlanId(req.getTargetMembershipPlanId());
        if (req.getMinPurchaseAmount() != null) rule.setMinPurchaseAmount(req.getMinPurchaseAmount());
        if (req.getMinReferralCount() != null) rule.setMinReferralCount(req.getMinReferralCount());
        if (req.getMaxRewardsPerMember() != null) rule.setMaxRewardsPerMember(req.getMaxRewardsPerMember());
    }

    private RewardRuleResponseDTO toDTO(ReferralRewardRule rule) {
        RewardRuleResponseDTO dto = new RewardRuleResponseDTO();
        dto.setId(rule.getId());
        dto.setName(rule.getName());
        dto.setType(rule.getType());
        dto.setValue(rule.getValue());
        dto.setUnit(rule.getUnit());
        dto.setEligibility(rule.getEligibility());
        dto.setConditionTrigger(rule.getConditionTrigger());
        dto.setIsActive(rule.getIsActive());
        dto.setExpiryDays(rule.getExpiryDays());
        dto.setRewardType(rule.getRewardType());
        dto.setRedemptionAction(rule.getRedemptionAction());
        dto.setCurrency(rule.getCurrency());
        dto.setPriority(rule.getPriority());
        dto.setStackable(rule.getStackable());
        dto.setRequiresApproval(rule.getRequiresApproval());
        dto.setCampaignId(rule.getCampaignId());
        dto.setCampaignStartDate(rule.getCampaignStartDate());
        dto.setCampaignEndDate(rule.getCampaignEndDate());
        dto.setTargetMembershipPlanId(rule.getTargetMembershipPlanId());
        dto.setMinPurchaseAmount(rule.getMinPurchaseAmount());
        dto.setMinReferralCount(rule.getMinReferralCount());
        dto.setMaxRewardsPerMember(rule.getMaxRewardsPerMember());
        dto.setCreatedAt(rule.getCreatedAt());
        if (rule.getCampaignId() != null) {
            campaignRepository.findById(rule.getCampaignId())
                    .ifPresent(c -> dto.setCampaignName(c.getName()));
        }
        return dto;
    }
}
