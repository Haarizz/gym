package com.company.project.entities;

import com.company.project.converters.JsonStringListConverter;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "promotions")
public class PromotionCampaign extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Core fields
    @Column(nullable = false)
    private String name;

    /** discount / voucher / combo / bogo / seasonal / loyalty / promotional-access-days */
    @Column(nullable = false)
    private String type;

    /** active / scheduled / expired / paused / draft */
    @Column(nullable = false)
    private String status = "draft";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    // Discount fields
    @Column(name = "discount_type")
    private String discountType;

    @Column(name = "discount_value", precision = 10, scale = 2)
    private BigDecimal discountValue = BigDecimal.ZERO;

    @Column(name = "minimum_purchase", precision = 10, scale = 2)
    private BigDecimal minimumPurchase;

    @Column(name = "maximum_discount", precision = 10, scale = 2)
    private BigDecimal maximumDiscount;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "usage_count")
    private Integer usageCount = 0;

    @Column(name = "usage_limit_per_member")
    private Integer usageLimitPerMember;

    private String code;

    // Targeting & channels
    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "applicable_plans", columnDefinition = "TEXT")
    private List<String> applicablePlans = new ArrayList<>();

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "applicable_services", columnDefinition = "TEXT")
    private List<String> applicableServices = new ArrayList<>();

    @Column(name = "target_audience")
    private String targetAudience = "all";

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "specific_members", columnDefinition = "TEXT")
    private List<String> specificMembers = new ArrayList<>();

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "channels", columnDefinition = "TEXT")
    private List<String> channels = new ArrayList<>();

    @Column(name = "auto_apply")
    private boolean autoApply = false;

    private boolean stackable = false;

    private Integer priority = 2;

    private String category;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "tags", columnDefinition = "TEXT")
    private List<String> tags = new ArrayList<>();

    // Performance & metadata
    @Column(name = "total_revenue", precision = 12, scale = 2)
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "total_savings", precision = 12, scale = 2)
    private BigDecimal totalSavings = BigDecimal.ZERO;

    @Column(name = "conversion_rate", precision = 5, scale = 2)
    private BigDecimal conversionRate = BigDecimal.ZERO;

    @Column(name = "click_count")
    private Integer clickCount = 0;

    @Column(name = "redemption_rate", precision = 5, scale = 2)
    private BigDecimal redemptionRate = BigDecimal.ZERO;

    @Column(name = "average_order_value", precision = 10, scale = 2)
    private BigDecimal averageOrderValue = BigDecimal.ZERO;

    private String image;

    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(name = "is_public")
    private boolean isPublic = false;

    // Promotional Access Days rules/config (stored as JSON strings)
    @Column(name = "policy_rules_json", columnDefinition = "TEXT")
    private String policyRulesJson;

    @Column(name = "policy_config_json", columnDefinition = "TEXT")
    private String policyConfigJson;

    public PromotionCampaign() {}

    // Getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

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

    public boolean isAutoApply() { return autoApply; }
    public void setAutoApply(boolean autoApply) { this.autoApply = autoApply; }

    public boolean isStackable() { return stackable; }
    public void setStackable(boolean stackable) { this.stackable = stackable; }

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

    public boolean isPublic() { return isPublic; }
    public void setPublic(boolean aPublic) { isPublic = aPublic; }

    public String getPolicyRulesJson() { return policyRulesJson; }
    public void setPolicyRulesJson(String policyRulesJson) { this.policyRulesJson = policyRulesJson; }

    public String getPolicyConfigJson() { return policyConfigJson; }
    public void setPolicyConfigJson(String policyConfigJson) { this.policyConfigJson = policyConfigJson; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
