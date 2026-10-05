package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Staff renewal / plan change for a member who is (or is becoming) the head of a
 * Couple or Family membership — see FamilyPlanChangeService (BG_75).
 *
 * The family after the change is: the head + keepMemberIds (current family members
 * staying) + linkMembers (existing gym members joining) + newMembers (new people).
 * Current family members NOT in keepMemberIds are detached. Moving to an Individual
 * plan detaches everyone.
 */
public class FamilyPlanChangeRequestDTO {

    private String planName;

    /** DB ids of current family members to keep. null = keep all of them. */
    private List<Long> keepMemberIds;
    private List<LinkMemberDTO> linkMembers;
    private List<FamilyMemberDTO> newMembers;

    /** Manual discount, taken off the head's own fee. */
    private BigDecimal discountAmount;
    private Long rewardPassId;
    private String couponCode;

    private BigDecimal amountReceived;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String bankAccountCode;
    private String bankAccountName;
    private Long processedByStaffId;

    /** An existing member being pulled into this family. */
    public static class LinkMemberDTO {
        private Long memberId;      // DB id
        private String relationship;
        private Boolean isMinor;    // null = keep what their record says

        public Long getMemberId() { return memberId; }
        public void setMemberId(Long memberId) { this.memberId = memberId; }
        public String getRelationship() { return relationship; }
        public void setRelationship(String relationship) { this.relationship = relationship; }
        public Boolean getIsMinor() { return isMinor; }
        public void setIsMinor(Boolean isMinor) { this.isMinor = isMinor; }
    }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }
    public List<Long> getKeepMemberIds() { return keepMemberIds; }
    public void setKeepMemberIds(List<Long> keepMemberIds) { this.keepMemberIds = keepMemberIds; }
    public List<LinkMemberDTO> getLinkMembers() { return linkMembers; }
    public void setLinkMembers(List<LinkMemberDTO> linkMembers) { this.linkMembers = linkMembers; }
    public List<FamilyMemberDTO> getNewMembers() { return newMembers; }
    public void setNewMembers(List<FamilyMemberDTO> newMembers) { this.newMembers = newMembers; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public Long getRewardPassId() { return rewardPassId; }
    public void setRewardPassId(Long rewardPassId) { this.rewardPassId = rewardPassId; }
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public BigDecimal getAmountReceived() { return amountReceived; }
    public void setAmountReceived(BigDecimal amountReceived) { this.amountReceived = amountReceived; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }
    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }
    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }
    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }
}
