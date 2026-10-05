package com.company.project.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * What a FamilyPlanChangeRequestDTO would do, computed by the same code that applies
 * it — shown to staff before they confirm (BG_75).
 */
public class FamilyPlanChangeQuoteDTO {

    private String planName;
    private String planType;
    /** true = one invoice on the head for everyone (family_head billing). */
    private boolean familyHeadBilling;
    private List<Line> lines = new ArrayList<>();
    /** Charged now, before any reward pass / coupon. */
    private BigDecimal subtotal = BigDecimal.ZERO;
    private BigDecimal rewardDiscount = BigDecimal.ZERO;
    /** What staff collect now (subtotal − reward). */
    private BigDecimal totalDue = BigDecimal.ZERO;
    private List<String> notes = new ArrayList<>();

    /**
     * One person. action: HEAD, KEEP, NEW, LINK or DETACH. billing: HEAD (on the
     * head's invoice), OWN (their own receipt now), NONE (not charged now).
     */
    public static class Line {
        private Long memberId;
        private String name;
        private String relationship;
        private boolean minor;
        private String action;
        private String billing;
        private BigDecimal fee = BigDecimal.ZERO;
        private String note;

        public Line() {}
        public Line(Long memberId, String name, String relationship, boolean minor,
                    String action, String billing, BigDecimal fee, String note) {
            this.memberId = memberId;
            this.name = name;
            this.relationship = relationship;
            this.minor = minor;
            this.action = action;
            this.billing = billing;
            this.fee = fee != null ? fee : BigDecimal.ZERO;
            this.note = note;
        }

        public Long getMemberId() { return memberId; }
        public void setMemberId(Long memberId) { this.memberId = memberId; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getRelationship() { return relationship; }
        public void setRelationship(String relationship) { this.relationship = relationship; }
        public boolean isMinor() { return minor; }
        public void setMinor(boolean minor) { this.minor = minor; }
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public String getBilling() { return billing; }
        public void setBilling(String billing) { this.billing = billing; }
        public BigDecimal getFee() { return fee; }
        public void setFee(BigDecimal fee) { this.fee = fee; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }
    public String getPlanType() { return planType; }
    public void setPlanType(String planType) { this.planType = planType; }
    public boolean isFamilyHeadBilling() { return familyHeadBilling; }
    public void setFamilyHeadBilling(boolean familyHeadBilling) { this.familyHeadBilling = familyHeadBilling; }
    public List<Line> getLines() { return lines; }
    public void setLines(List<Line> lines) { this.lines = lines; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getRewardDiscount() { return rewardDiscount; }
    public void setRewardDiscount(BigDecimal rewardDiscount) { this.rewardDiscount = rewardDiscount; }
    public BigDecimal getTotalDue() { return totalDue; }
    public void setTotalDue(BigDecimal totalDue) { this.totalDue = totalDue; }
    public List<String> getNotes() { return notes; }
    public void setNotes(List<String> notes) { this.notes = notes; }
}
