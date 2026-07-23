package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class PromotionCampaignRequestDTO {

    private String name;
    private String type;
    private String status;
    private String description;
    private String startDate;
    private String endDate;

    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal minimumPurchase;
    private BigDecimal maximumDiscount;
    private Integer usageLimit;
    private Integer usageCount;
    private Integer usageLimitPerMember;
    private String code;

    private List<String> applicablePlans = new ArrayList<>();
    private List<String> applicableServices = new ArrayList<>();
    private String targetAudience;
    private List<String> specificMembers = new ArrayList<>();
    private List<String> channels = new ArrayList<>();
    private Boolean autoApply;
    private Boolean stackable;
    private Integer priority;
    private String category;
    private List<String> tags = new ArrayList<>();

    private BigDecimal totalRevenue;
    private BigDecimal totalSavings;
    private BigDecimal conversionRate;
    private Integer clickCount;
    private BigDecimal redemptionRate;
    private BigDecimal averageOrderValue;

    private String image;
    private String termsAndConditions;
    private Boolean isPublic;

    private String policyRulesJson;
    private String policyConfigJson;

    private String createdBy;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }

    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

    public BigDecimal getMinimumPurchase() { return minimumPurchase; }
    public void setMinimumPurchase(BigDecimal minimumPurchase) { this.minimumPurchase = minimumPurchase; }

    public BigDecimal getMaximumDiscount() { return maximumDiscount; }
    public void setMaximumDiscount(BigDecimal maximumDiscount) { this.maximumDiscount = maximumDiscount; }

    public Integer getUsageLimit() { return usageLimit; }
    public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }

    public Integer getUsageCount() { return usageCount; }
    public void setUsageCount(Integer usageCount) { this.usageCount = usageCount; }

    public Integer getUsageLimitPerMember() { return usageLimitPerMember; }
    public void setUsageLimitPerMember(Integer usageLimitPerMember) { this.usageLimitPerMember = usageLimitPerMember; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public List<String> getApplicablePlans() { return applicablePlans; }
    public void setApplicablePlans(List<String> applicablePlans) { this.applicablePlans = applicablePlans; }

    public List<String> getApplicableServices() { return applicableServices; }
    public void setApplicableServices(List<String> applicableServices) { this.applicableServices = applicableServices; }

    public String getTargetAudience() { return targetAudience; }
    public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }

    public List<String> getSpecificMembers() { return specificMembers; }
    public void setSpecificMembers(List<String> specificMembers) { this.specificMembers = specificMembers; }

    public List<String> getChannels() { return channels; }
    public void setChannels(List<String> channels) { this.channels = channels; }

    public Boolean getAutoApply() { return autoApply; }
    public void setAutoApply(Boolean autoApply) { this.autoApply = autoApply; }

    public Boolean getStackable() { return stackable; }
    public void setStackable(Boolean stackable) { this.stackable = stackable; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public BigDecimal getTotalSavings() { return totalSavings; }
    public void setTotalSavings(BigDecimal totalSavings) { this.totalSavings = totalSavings; }

    public BigDecimal getConversionRate() { return conversionRate; }
    public void setConversionRate(BigDecimal conversionRate) { this.conversionRate = conversionRate; }

    public Integer getClickCount() { return clickCount; }
    public void setClickCount(Integer clickCount) { this.clickCount = clickCount; }

    public BigDecimal getRedemptionRate() { return redemptionRate; }
    public void setRedemptionRate(BigDecimal redemptionRate) { this.redemptionRate = redemptionRate; }

    public BigDecimal getAverageOrderValue() { return averageOrderValue; }
    public void setAverageOrderValue(BigDecimal averageOrderValue) { this.averageOrderValue = averageOrderValue; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getTermsAndConditions() { return termsAndConditions; }
    public void setTermsAndConditions(String termsAndConditions) { this.termsAndConditions = termsAndConditions; }

    public Boolean getIsPublic() { return isPublic; }
    public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }

    public String getPolicyRulesJson() { return policyRulesJson; }
    public void setPolicyRulesJson(String policyRulesJson) { this.policyRulesJson = policyRulesJson; }

    public String getPolicyConfigJson() { return policyConfigJson; }
    public void setPolicyConfigJson(String policyConfigJson) { this.policyConfigJson = policyConfigJson; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}
