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

        public MembershipInfo() {
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

    public static class BenefitInfo {
        private String id;
        private String name;
        private String description;

        public BenefitInfo() {
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
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
