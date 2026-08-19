package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Filter(name = "branchFilter", condition = "branch_id = :branchId OR branch_id IS NULL")
@Entity
@Table(name = "referrals")
public class Referral extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business ID: REF-XXXXXXXXXX
    @Column(name = "referral_id", unique = true)
    private String referralId;

    // Who referred (member's memberId e.g. MBR-0000000001)
    @Column(name = "referrer_member_id")
    private String referrerMemberId;

    @Column(name = "referrer_name")
    private String referrerName;

    // The person being referred (not yet a member)
    @Column(name = "referee_name")
    private String refereeName;

    @Column(name = "referee_email")
    private String refereeEmail;

    @Column(name = "referee_phone")
    private String refereePhone;

    // Base64 data-URL photo of the referred person, captured/uploaded on the Add
    // Referral form — used by front-desk staff for gym access verification.
    // Stored the same way as Member.photoUrl (no separate file storage in this app).
    @Column(name = "referee_photo", columnDefinition = "TEXT")
    private String refereePhoto;

    // Unique referral code used by the referee to sign up
    @Column(name = "referral_code", unique = true)
    private String referralCode;

    // pending / successful / expired
    @Column(name = "status")
    private String status;

    @Column(name = "reward_amount", precision = 10, scale = 2)
    private BigDecimal rewardAmount;

    @Column(name = "date")
    private LocalDate date;

    // When the referred person is expected to visit the gym (set at referral creation).
    @Column(name = "visit_date")
    private LocalDate visitDate;

    @Column(name = "signup_date")
    private LocalDate signupDate;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Which rule was applied (FK-like to ReferralRewardRule id)
    @Column(name = "rule_id")
    private Long ruleId;

    @Column(name = "rule_name")
    private String ruleName;

    // Whether the referrer has already redeemed this referral's reward against a
    // transaction (e.g. an add-on purchase). Kept separate from `status` since a
    // referral can be "successful" for a while before its reward gets spent.
    @Column(name = "reward_redeemed")
    private Boolean rewardRedeemed = false;

    // Amount the referee actually paid at signup — captured when markSuccessful()
    // is called so reward rules can validate a minPurchaseAmount condition.
    @Column(name = "purchase_amount", precision = 10, scale = 2)
    private BigDecimal purchaseAmount;

    // Which membership plan the referee purchased — lets reward rules target a
    // specific plan via ReferralRewardRule.targetMembershipPlanId.
    @Column(name = "membership_plan_id")
    private Long membershipPlanId;

    // The referee's business member id (e.g. MBR-0000000002), captured at
    // markSuccessful() time once the referee has actually become a member —
    // needed so the reward engine can attach a referee-side ReferralReward.
    @Column(name = "referee_member_id")
    private String refereeMemberId;

    public Referral() {}

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReferralId() { return referralId; }
    public void setReferralId(String referralId) { this.referralId = referralId; }

    public String getReferrerMemberId() { return referrerMemberId; }
    public void setReferrerMemberId(String referrerMemberId) { this.referrerMemberId = referrerMemberId; }

    public String getReferrerName() { return referrerName; }
    public void setReferrerName(String referrerName) { this.referrerName = referrerName; }

    public String getRefereeName() { return refereeName; }
    public void setRefereeName(String refereeName) { this.refereeName = refereeName; }

    public String getRefereeEmail() { return refereeEmail; }
    public void setRefereeEmail(String refereeEmail) { this.refereeEmail = refereeEmail; }

    public String getRefereePhone() { return refereePhone; }
    public void setRefereePhone(String refereePhone) { this.refereePhone = refereePhone; }

    public String getRefereePhoto() { return refereePhoto; }
    public void setRefereePhoto(String refereePhoto) { this.refereePhoto = refereePhoto; }

    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String referralCode) { this.referralCode = referralCode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getRewardAmount() { return rewardAmount; }
    public void setRewardAmount(BigDecimal rewardAmount) { this.rewardAmount = rewardAmount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }

    public LocalDate getSignupDate() { return signupDate; }
    public void setSignupDate(LocalDate signupDate) { this.signupDate = signupDate; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getRuleId() { return ruleId; }
    public void setRuleId(Long ruleId) { this.ruleId = ruleId; }

    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }

    public Boolean getRewardRedeemed() { return rewardRedeemed; }
    public void setRewardRedeemed(Boolean rewardRedeemed) { this.rewardRedeemed = rewardRedeemed; }

    public BigDecimal getPurchaseAmount() { return purchaseAmount; }
    public void setPurchaseAmount(BigDecimal purchaseAmount) { this.purchaseAmount = purchaseAmount; }

    public Long getMembershipPlanId() { return membershipPlanId; }
    public void setMembershipPlanId(Long membershipPlanId) { this.membershipPlanId = membershipPlanId; }

    public String getRefereeMemberId() { return refereeMemberId; }
    public void setRefereeMemberId(String refereeMemberId) { this.refereeMemberId = refereeMemberId; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @jakarta.persistence.PrePersist
    public void prePersistBranchId() {
        if (this.branchId == null) {
            Long activeBranch = com.company.project.security.BranchContextHolder.getActiveBranchId();
            if (activeBranch != null) {
                this.branchId = activeBranch;
            }
        }
    }
}
