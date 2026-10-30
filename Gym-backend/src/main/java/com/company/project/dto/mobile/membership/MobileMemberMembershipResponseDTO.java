package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class MobileMemberMembershipResponseDTO {

    private MembershipInfo membership;
    private List<BenefitInfo> benefits;
    private FreezeInfo freeze;
    private RenewalOfferInfo renewalOffer;

    public MobileMemberMembershipResponseDTO() {
    }

    public MembershipInfo getMembership() {
        return membership;
    }

    public void setMembership(MembershipInfo membership) {
        this.membership = membership;
    }

    public List<BenefitInfo> getBenefits() {
        return benefits;
    }

    public void setBenefits(List<BenefitInfo> benefits) {
        this.benefits = benefits;
    }

    public FreezeInfo getFreeze() {
        return freeze;
    }

    public void setFreeze(FreezeInfo freeze) {
        this.freeze = freeze;
    }

    public RenewalOfferInfo getRenewalOffer() {
        return renewalOffer;
    }

    public void setRenewalOffer(RenewalOfferInfo renewalOffer) {
        this.renewalOffer = renewalOffer;
    }

    public static class MembershipInfo {
        private Long id;
        private PlanInfo plan;
        private String status;
        private LocalDateTime startDate;
        private LocalDateTime expiryDate;
        private Boolean autoRenew;
        private Integer totalDays;
        private Integer remainingDays;
        // The member's branch — the family screen loads this gym's plans/quote by it.
        private Long branchId;

        public MembershipInfo() {
        }

        public Long getBranchId() {
            return branchId;
        }

        public void setBranchId(Long branchId) {
            this.branchId = branchId;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public PlanInfo getPlan() {
            return plan;
        }

        public void setPlan(PlanInfo plan) {
            this.plan = plan;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public LocalDateTime getStartDate() {
            return startDate;
        }

        public void setStartDate(LocalDateTime startDate) {
            this.startDate = startDate;
        }

        public LocalDateTime getExpiryDate() {
            return expiryDate;
        }

        public void setExpiryDate(LocalDateTime expiryDate) {
            this.expiryDate = expiryDate;
        }

        public Boolean getAutoRenew() {
            return autoRenew;
        }

        public void setAutoRenew(Boolean autoRenew) {
            this.autoRenew = autoRenew;
        }

        public Integer getTotalDays() {
            return totalDays;
        }

        public void setTotalDays(Integer totalDays) {
            this.totalDays = totalDays;
        }

        public Integer getRemainingDays() {
            return remainingDays;
        }

        public void setRemainingDays(Integer remainingDays) {
            this.remainingDays = remainingDays;
        }
    }

    public static class PlanInfo {
        private Long id;
        private String name;
        private BigDecimal price;
        private String duration;

        public PlanInfo() {
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public BigDecimal getPrice() {
            return price;
        }

        public void setPrice(BigDecimal price) {
            this.price = price;
        }

        public String getDuration() {
            return duration;
        }

        public void setDuration(String duration) {
            this.duration = duration;
        }
    }

    /**
     * One thing the member's plan actually includes. The app builds its (translated) text
     * from {@code type} and the raw values; {@code name}/{@code description} are an English
     * fallback for older app builds and unknown types.
     */
    public static class BenefitInfo {
        private String id;
        /** "access", "facilities", "sessions", "trainers", "streams", "addon" or "plan_notes". */
        private String type;
        private String name;
        private String description;
        /** Names the benefit covers: facilities, trainers, training streams. */
        private List<String> items;
        /** Allowance size: visits/days/hours per period, or included sessions. */
        private Integer count;
        /** Amount of the access allowance used in the current period. */
        private Integer used;
        /** Access allowance unit: "Sessions", "Days" or "Hours" (null when unlimited). */
        private String unit;
        /** Access allowance period: "Payment", "Week", "Month" or "Year". */
        private String period;
        /** When an add-on runs out. */
        private LocalDateTime expiresAt;

        public BenefitInfo() {
        }

        public BenefitInfo(String id, String type, String name, String description) {
            this.id = id;
            this.type = type;
            this.name = name;
            this.description = description;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public List<String> getItems() {
            return items;
        }

        public void setItems(List<String> items) {
            this.items = items;
        }

        public Integer getCount() {
            return count;
        }

        public void setCount(Integer count) {
            this.count = count;
        }

        public Integer getUsed() {
            return used;
        }

        public void setUsed(Integer used) {
            this.used = used;
        }

        public String getUnit() {
            return unit;
        }

        public void setUnit(String unit) {
            this.unit = unit;
        }

        public String getPeriod() {
            return period;
        }

        public void setPeriod(String period) {
            this.period = period;
        }

        public LocalDateTime getExpiresAt() {
            return expiresAt;
        }

        public void setExpiresAt(LocalDateTime expiresAt) {
            this.expiresAt = expiresAt;
        }
    }

    public static class FreezeInfo {
        private Boolean available;
        private Integer allowedDays;
        private Boolean isFrozen;
        private String startDate;
        private String endDate;

        public FreezeInfo() {
        }

        public Boolean getAvailable() {
            return available;
        }

        public void setAvailable(Boolean available) {
            this.available = available;
        }

        public Integer getAllowedDays() {
            return allowedDays;
        }

        public void setAllowedDays(Integer allowedDays) {
            this.allowedDays = allowedDays;
        }

        public Boolean getIsFrozen() {
            return isFrozen;
        }

        public void setIsFrozen(Boolean frozen) {
            isFrozen = frozen;
        }

        public String getStartDate() {
            return startDate;
        }

        public void setStartDate(String startDate) {
            this.startDate = startDate;
        }

        public String getEndDate() {
            return endDate;
        }

        public void setEndDate(String endDate) {
            this.endDate = endDate;
        }

        // Plan freeze policy and what's left of it in the current plan period.
        // allowedDays above is the days still available (remainingDays).
        private Integer maxDays;
        private Integer usedDays;
        private Integer maxOccurrences;       // null = no limit
        private Integer usedOccurrences;
        private Integer remainingOccurrences; // null = no limit
        private Integer freeDaysRemaining;
        private BigDecimal chargePerExtraDay;
        private String currencySymbol;
        private Boolean autoUnfreeze;
        private String unavailableReason;     // PLAN_DOES_NOT_ALLOW | NO_DAYS_LEFT | NO_FREEZES_LEFT
        private String unavailableMessage;

        public Integer getMaxDays() { return maxDays; }
        public void setMaxDays(Integer maxDays) { this.maxDays = maxDays; }

        public Integer getUsedDays() { return usedDays; }
        public void setUsedDays(Integer usedDays) { this.usedDays = usedDays; }

        public Integer getMaxOccurrences() { return maxOccurrences; }
        public void setMaxOccurrences(Integer maxOccurrences) { this.maxOccurrences = maxOccurrences; }

        public Integer getUsedOccurrences() { return usedOccurrences; }
        public void setUsedOccurrences(Integer usedOccurrences) { this.usedOccurrences = usedOccurrences; }

        public Integer getRemainingOccurrences() { return remainingOccurrences; }
        public void setRemainingOccurrences(Integer remainingOccurrences) { this.remainingOccurrences = remainingOccurrences; }

        public Integer getFreeDaysRemaining() { return freeDaysRemaining; }
        public void setFreeDaysRemaining(Integer freeDaysRemaining) { this.freeDaysRemaining = freeDaysRemaining; }

        public BigDecimal getChargePerExtraDay() { return chargePerExtraDay; }
        public void setChargePerExtraDay(BigDecimal chargePerExtraDay) { this.chargePerExtraDay = chargePerExtraDay; }

        public String getCurrencySymbol() { return currencySymbol; }
        public void setCurrencySymbol(String currencySymbol) { this.currencySymbol = currencySymbol; }

        public Boolean getAutoUnfreeze() { return autoUnfreeze; }
        public void setAutoUnfreeze(Boolean autoUnfreeze) { this.autoUnfreeze = autoUnfreeze; }

        public String getUnavailableReason() { return unavailableReason; }
        public void setUnavailableReason(String unavailableReason) { this.unavailableReason = unavailableReason; }

        public String getUnavailableMessage() { return unavailableMessage; }
        public void setUnavailableMessage(String unavailableMessage) { this.unavailableMessage = unavailableMessage; }
    }

    public static class RenewalOfferInfo {
        private Boolean available;
        private BigDecimal discountPercentage;
        private String description;
        private List<String> perks;

        public RenewalOfferInfo() {
        }

        public Boolean getAvailable() {
            return available;
        }

        public void setAvailable(Boolean available) {
            this.available = available;
        }

        public BigDecimal getDiscountPercentage() {
            return discountPercentage;
        }

        public void setDiscountPercentage(BigDecimal discountPercentage) {
            this.discountPercentage = discountPercentage;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public List<String> getPerks() {
            return perks;
        }

        public void setPerks(List<String> perks) {
            this.perks = perks;
        }
    }
}
