package com.company.project.entities;

import com.company.project.converters.ApplicationFamilyMembersConverter;
import com.company.project.dto.MembershipApplicationDTOs.ApplicationFamilyMember;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A visitor's membership application from the public Service Portfolios link.
 * It grants nothing by itself: staff approve it, and only then is the member
 * created with the chosen plan. Payment status and approval status are separate —
 * a paid online application still waits for approval.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "membership_applications")
public class MembershipApplication extends BaseEntity implements BranchAware {

    public static final String METHOD_CASH = "CASH";
    public static final String METHOD_ONLINE = "ONLINE";

    public static final String PAYMENT_PENDING = "PENDING";
    public static final String PAYMENT_PAID = "PAID";
    public static final String PAYMENT_REFUNDED = "REFUNDED";
    public static final String PAYMENT_VOID = "VOID";

    public static final String APPROVAL_PENDING = "PENDING";
    public static final String APPROVAL_APPROVED = "APPROVED";
    public static final String APPROVAL_REJECTED = "REJECTED";

    /** Visitor applied on the public share link. */
    public static final String SOURCE_SHARE_LINK = "SHARE_LINK";
    /** Staff raised it at the gym for a walk-in (Service Portfolios → Register as New Member). */
    public static final String SOURCE_DESK = "DESK";

    /** decision_email_status: the approve / reject email to the applicant. */
    public static final String EMAIL_SENT = "SENT";
    public static final String EMAIL_FAILED = "FAILED";
    public static final String EMAIL_NOT_CONFIGURED = "NOT_CONFIGURED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(nullable = false, length = 20)
    private String reference;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, length = 50)
    private String phone;

    private String email;

    @Column(length = 20)
    private String gender;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 50)
    private String emergencyContactPhone;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "plan_name", nullable = false)
    private String planName;

    @Column(name = "plan_duration", length = 100)
    private String planDuration;

    @Column(name = "list_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal listPrice = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "offer_label")
    private String offerLabel;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod;

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = PAYMENT_PENDING;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "card_brand", length = 30)
    private String cardBrand;

    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "cash_received_by")
    private String cashReceivedBy;

    @Column(name = "approval_status", nullable = false, length = 20)
    private String approvalStatus = APPROVAL_PENDING;

    @Column(name = "decided_by")
    private String decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "member_code", length = 50)
    private String memberCode;

    @Column(nullable = false, length = 20)
    private String source = SOURCE_SHARE_LINK;

    @Column(name = "reg_doc_number", length = 100)
    private String regDocNumber;

    @Column(name = "medical_conditions", columnDefinition = "TEXT")
    private String medicalConditions;

    /** Partner / family members on a Family or Couple plan (JSON); empty for one person. */
    @Convert(converter = ApplicationFamilyMembersConverter.class)
    @Column(name = "family_members", columnDefinition = "TEXT")
    private List<ApplicationFamilyMember> familyMembers = new ArrayList<>();

    @Column(name = "decision_email_status", length = 20)
    private String decisionEmailStatus;

    @Column(name = "decision_email_error", columnDefinition = "TEXT")
    private String decisionEmailError;

    @Column(name = "decision_email_at")
    private LocalDateTime decisionEmailAt;

    public List<ApplicationFamilyMember> getFamilyMembers() { return familyMembers; }
    public void setFamilyMembers(List<ApplicationFamilyMember> familyMembers) {
        this.familyMembers = familyMembers != null ? familyMembers : new ArrayList<>();
    }

    public boolean isPaid() { return PAYMENT_PAID.equals(paymentStatus); }
    public boolean isAwaitingDecision() { return APPROVAL_PENDING.equals(approvalStatus); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override public Long getBranchId() { return branchId; }
    @Override public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public String getPlanDuration() { return planDuration; }
    public void setPlanDuration(String planDuration) { this.planDuration = planDuration; }

    public BigDecimal getListPrice() { return listPrice; }
    public void setListPrice(BigDecimal listPrice) { this.listPrice = listPrice; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getOfferLabel() { return offerLabel; }
    public void setOfferLabel(String offerLabel) { this.offerLabel = offerLabel; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }

    public String getCardBrand() { return cardBrand; }
    public void setCardBrand(String cardBrand) { this.cardBrand = cardBrand; }

    public String getCardLast4() { return cardLast4; }
    public void setCardLast4(String cardLast4) { this.cardLast4 = cardLast4; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public String getCashReceivedBy() { return cashReceivedBy; }
    public void setCashReceivedBy(String cashReceivedBy) { this.cashReceivedBy = cashReceivedBy; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }

    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberCode() { return memberCode; }
    public void setMemberCode(String memberCode) { this.memberCode = memberCode; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getRegDocNumber() { return regDocNumber; }
    public void setRegDocNumber(String regDocNumber) { this.regDocNumber = regDocNumber; }

    public String getMedicalConditions() { return medicalConditions; }
    public void setMedicalConditions(String medicalConditions) { this.medicalConditions = medicalConditions; }

    public String getDecisionEmailStatus() { return decisionEmailStatus; }
    public void setDecisionEmailStatus(String decisionEmailStatus) { this.decisionEmailStatus = decisionEmailStatus; }

    public String getDecisionEmailError() { return decisionEmailError; }
    public void setDecisionEmailError(String decisionEmailError) { this.decisionEmailError = decisionEmailError; }

    public LocalDateTime getDecisionEmailAt() { return decisionEmailAt; }
    public void setDecisionEmailAt(LocalDateTime decisionEmailAt) { this.decisionEmailAt = decisionEmailAt; }
}
