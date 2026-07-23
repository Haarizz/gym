package com.company.project.services;

import com.company.project.dto.PromotionCampaignRequestDTO;
import com.company.project.dto.PromotionCampaignResponseDTO;
import com.company.project.entities.PromotionCampaign;
import com.company.project.repositories.PromotionCampaignRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PromotionCampaignService {

    private final PromotionCampaignRepository promotionRepository;

    public PromotionCampaignService(PromotionCampaignRepository promotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    public List<PromotionCampaignResponseDTO> getPromotions(String status) {
        List<PromotionCampaign> items = (status != null && !status.isBlank())
                ? promotionRepository.findByStatusOrderByCreatedAtDesc(status)
                : promotionRepository.findAllByOrderByCreatedAtDesc();
        return items.stream().map(PromotionCampaignResponseDTO::fromEntity).collect(Collectors.toList());
    }

    public PromotionCampaignResponseDTO getPromotionById(Long id) {
        PromotionCampaign promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promotion not found: " + id));
        return PromotionCampaignResponseDTO.fromEntity(promotion);
    }

    public PromotionCampaignResponseDTO createPromotion(PromotionCampaignRequestDTO req) {
        PromotionCampaign promotion = new PromotionCampaign();
        applyRequest(promotion, req, true);
        return PromotionCampaignResponseDTO.fromEntity(promotionRepository.save(promotion));
    }

    public PromotionCampaignResponseDTO updatePromotion(Long id, PromotionCampaignRequestDTO req) {
        PromotionCampaign promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promotion not found: " + id));
        applyRequest(promotion, req, false);
        return PromotionCampaignResponseDTO.fromEntity(promotionRepository.save(promotion));
    }

    public void deletePromotion(Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new RuntimeException("Promotion not found: " + id);
        }
        promotionRepository.deleteById(id);
    }

    public PromotionCampaignResponseDTO duplicatePromotion(Long id) {
        PromotionCampaign original = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promotion not found: " + id));

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
}
