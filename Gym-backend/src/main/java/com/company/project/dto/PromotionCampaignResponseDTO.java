package com.company.project.dto;

import com.company.project.entities.PromotionCampaign;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class PromotionCampaignResponseDTO {

    private Long id;
    private String name;
    private String type;
    private String status;
    private String description;
    private String startDate;
    private String endDate;
    private String createdDate;

    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal minimumPurchase;
    private BigDecimal maximumDiscount;
    private Integer usageLimit;
    private Integer usageCount;
    private Integer usageLimitPerMember;
    private String code;

    private List<String> applicablePlans;
    private List<String> applicableServices;
    private String targetAudience;
    private List<String> specificMembers;
    private List<String> channels;
    private boolean autoApply;
    private boolean stackable;
    private Integer priority;
    private String category;
    private List<String> tags;

    private String createdBy;
    private BigDecimal totalRevenue;
    private BigDecimal totalSavings;
    private BigDecimal conversionRate;
    private Integer clickCount;
    private BigDecimal redemptionRate;
    private BigDecimal averageOrderValue;

    private String image;
    private String termsAndConditions;
    private boolean isPublic;

    private String policyRulesJson;
    private String policyConfigJson;

    private String createdAt;
    private String updatedAt;

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter ISO_DATE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static PromotionCampaignResponseDTO fromEntity(PromotionCampaign p) {
        PromotionCampaignResponseDTO dto = new PromotionCampaignResponseDTO();
        dto.id = p.getId();
        dto.name = p.getName();
        dto.type = p.getType();
        dto.status = p.getStatus();
        dto.description = p.getDescription();
        dto.startDate = p.getStartDate() != null ? p.getStartDate().format(ISO_DATE) : null;
        dto.endDate = p.getEndDate() != null ? p.getEndDate().format(ISO_DATE) : null;
        dto.createdDate = p.getCreatedAt() != null ? p.getCreatedAt().format(ISO_DATE_TIME) + "Z" : null;

        dto.discountType = p.getDiscountType();
        dto.discountValue = p.getDiscountValue() != null ? p.getDiscountValue() : BigDecimal.ZERO;
        dto.minimumPurchase = p.getMinimumPurchase();
        dto.maximumDiscount = p.getMaximumDiscount();
        dto.usageLimit = p.getUsageLimit();
        dto.usageCount = p.getUsageCount();
        dto.usageLimitPerMember = p.getUsageLimitPerMember();
        dto.code = p.getCode();

        dto.applicablePlans = p.getApplicablePlans();
        dto.applicableServices = p.getApplicableServices();
        dto.targetAudience = p.getTargetAudience();
        dto.specificMembers = p.getSpecificMembers();
        dto.channels = p.getChannels();
        dto.autoApply = p.isAutoApply();
        dto.stackable = p.isStackable();
        dto.priority = p.getPriority();
        dto.category = p.getCategory();
        dto.tags = p.getTags();

        dto.createdBy = p.getCreatedBy();
        dto.totalRevenue = p.getTotalRevenue() != null ? p.getTotalRevenue() : BigDecimal.ZERO;
        dto.totalSavings = p.getTotalSavings() != null ? p.getTotalSavings() : BigDecimal.ZERO;
        dto.conversionRate = p.getConversionRate() != null ? p.getConversionRate() : BigDecimal.ZERO;
        dto.clickCount = p.getClickCount() != null ? p.getClickCount() : 0;
        dto.redemptionRate = p.getRedemptionRate() != null ? p.getRedemptionRate() : BigDecimal.ZERO;
        dto.averageOrderValue = p.getAverageOrderValue() != null ? p.getAverageOrderValue() : BigDecimal.ZERO;

        dto.image = p.getImage();
        dto.termsAndConditions = p.getTermsAndConditions();
        dto.isPublic = p.isPublic();
        dto.policyRulesJson = p.getPolicyRulesJson();
        dto.policyConfigJson = p.getPolicyConfigJson();

        dto.createdAt = p.getCreatedAt() != null ? p.getCreatedAt().format(ISO_DATE_TIME) + "Z" : null;
        dto.updatedAt = p.getUpdatedAt() != null ? p.getUpdatedAt().format(ISO_DATE_TIME) + "Z" : null;
        return dto;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public String getStatus() { return status; }
    public String getDescription() { return description; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public String getCreatedDate() { return createdDate; }
    public String getDiscountType() { return discountType; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public BigDecimal getMinimumPurchase() { return minimumPurchase; }
    public BigDecimal getMaximumDiscount() { return maximumDiscount; }
    public Integer getUsageLimit() { return usageLimit; }
    public Integer getUsageCount() { return usageCount; }
    public Integer getUsageLimitPerMember() { return usageLimitPerMember; }
    public String getCode() { return code; }
    public List<String> getApplicablePlans() { return applicablePlans; }
    public List<String> getApplicableServices() { return applicableServices; }
    public String getTargetAudience() { return targetAudience; }
    public List<String> getSpecificMembers() { return specificMembers; }
    public List<String> getChannels() { return channels; }
    public boolean isAutoApply() { return autoApply; }
    public boolean isStackable() { return stackable; }
    public Integer getPriority() { return priority; }
    public String getCategory() { return category; }
    public List<String> getTags() { return tags; }
    public String getCreatedBy() { return createdBy; }
    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public BigDecimal getTotalSavings() { return totalSavings; }
    public BigDecimal getConversionRate() { return conversionRate; }
    public Integer getClickCount() { return clickCount; }
    public BigDecimal getRedemptionRate() { return redemptionRate; }
    public BigDecimal getAverageOrderValue() { return averageOrderValue; }
    public String getImage() { return image; }
    public String getTermsAndConditions() { return termsAndConditions; }
    public boolean isPublic() { return isPublic; }
    public String getPolicyRulesJson() { return policyRulesJson; }
    public String getPolicyConfigJson() { return policyConfigJson; }
    public String getCreatedAt() { return createdAt; }
    public String getUpdatedAt() { return updatedAt; }
}
