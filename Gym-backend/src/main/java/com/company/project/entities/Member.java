package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "members")
public class Member extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business ID: MBR-XXXXXXXXXX, generated after first DB insert
    @Column(name = "member_id", unique = true)
    private String memberId;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String phone;

    // Basic / Standard / Premium / VIP
    @Column(name = "membership_type")
    private String membershipType;

    // active / inactive / suspended / expired
    @Column(name = "membership_status")
    private String membershipStatus;

    // e.g. "Premium Monthly", "Platinum Annual"
    @Column(name = "membership_plan")
    private String membershipPlan;

    @Column(name = "join_date")
    private LocalDateTime joinDate;

    @Column(name = "membership_start_date")
    private LocalDateTime membershipStartDate;

    @Column(name = "membership_end_date")
    private LocalDateTime membershipEndDate;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "monthly_fee", precision = 10, scale = 2)
    private BigDecimal monthlyFee;

    @Column(name = "membership_fee", precision = 10, scale = 2)
    private BigDecimal membershipFee;

    @Column(name = "total_visits")
    private Integer totalVisits = 0;

    // paid / overdue / pending
    @Column(name = "payment_status")
    private String paymentStatus;

    // Health & Emergency
    @Column(name = "emergency_contact")
    private String emergencyContact;

    @Column(name = "emergency_phone")
    private String emergencyPhone;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "medical_conditions", columnDefinition = "TEXT")
    private String medicalConditions;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "current_medications", columnDefinition = "TEXT")
    private String currentMedications;

    @Column(name = "health_notes", columnDefinition = "TEXT")
    private String healthNotes;

    // Freeze management
    @Column(name = "freeze_start_date")
    private LocalDateTime freezeStartDate;

    @Column(name = "freeze_end_date")
    private LocalDateTime freezeEndDate;

    @Column(name = "freeze_reason")
    private String freezeReason;

    // Additional profile fields
    @Column(name = "gender")
    private String gender;

    @Column(name = "nationality")
    private String nationality;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "chronic_illnesses", columnDefinition = "TEXT")
    private String chronicIllnesses;

    @Column(name = "height")
    private Double height;

    @Column(name = "weight")
    private Double weight;

    // Identity / Registration document
    @Column(name = "reg_doc_number")
    private String regDocNumber;

    @Column(name = "reg_doc_date")
    private LocalDateTime regDocDate;

    // Financial tracking
    @Column(name = "outstanding_balance", precision = 10, scale = 2)
    private java.math.BigDecimal outstandingBalance;

    @Column(name = "last_payment_date")
    private LocalDateTime lastPaymentDate;

    @Column(name = "next_payment_date")
    private LocalDateTime nextPaymentDate;

    @Column(name = "payment_method_used")
    private String paymentMethodUsed;

    @Column(name = "discount_applied", precision = 10, scale = 2)
    private java.math.BigDecimal discountApplied;

    // Family plan fields
    @Column(name = "is_family_head")
    private Boolean isFamilyHead = false;

    @Column(name = "family_head_id")
    private String familyHeadId;

    @Column(name = "relationship_to_head")
    private String relationshipToHead;

    // True for a non-adult family member whose charges/renewals are billed to the
    // family head instead of carrying their own outstandingBalance/receipts/ledger.
    @Column(name = "is_minor")
    private Boolean isMinor = false;

    // True when this member's charges/renewals are folded into the family head's
    // single invoice instead of carrying their own outstandingBalance/receipts/ledger.
    // Always true for a minor (isMinor); also true for an ADULT dependent when their
    // family plan's billing mode is "family_head" (see MembershipPlan.familyBillingMode).
    // Kept separate from isMinor so billing routing and age/relationship reporting
    // don't have to stay conflated.
    @Column(name = "billed_to_head")
    private Boolean billedToHead = false;

    // Face recognition device enrollment
    @Column(name = "face_id")
    private String faceId;  // null until face recognition device is enrolled

    // App authentication fields
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "app_username")
    private String appUsername;

    @Column(name = "app_access_enabled")
    private Boolean appAccessEnabled;

    // Reward wallet running balance — credited by RewardRedemptionService when a
    // WALLET_CREDIT reward is redeemed, spent down at checkout. Tracked in detail
    // by WalletTransaction; this column is the cached current total.
    @Column(name = "wallet_balance", precision = 12, scale = 2)
    private BigDecimal walletBalance = BigDecimal.ZERO;

    public Member() {}

    // ── Getters & Setters ───────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }

    public String getMembershipPlan() { return membershipPlan; }
    public void setMembershipPlan(String membershipPlan) { this.membershipPlan = membershipPlan; }

    public LocalDateTime getJoinDate() { return joinDate; }
    public void setJoinDate(LocalDateTime joinDate) { this.joinDate = joinDate; }

    public LocalDateTime getMembershipStartDate() { return membershipStartDate; }
    public void setMembershipStartDate(LocalDateTime membershipStartDate) { this.membershipStartDate = membershipStartDate; }

    public LocalDateTime getMembershipEndDate() { return membershipEndDate; }
    public void setMembershipEndDate(LocalDateTime membershipEndDate) { this.membershipEndDate = membershipEndDate; }

    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }

    public BigDecimal getMonthlyFee() { return monthlyFee; }
    public void setMonthlyFee(BigDecimal monthlyFee) { this.monthlyFee = monthlyFee; }

    public BigDecimal getMembershipFee() { return membershipFee; }
    public void setMembershipFee(BigDecimal membershipFee) { this.membershipFee = membershipFee; }

    public Integer getTotalVisits() { return totalVisits; }
    public void setTotalVisits(Integer totalVisits) { this.totalVisits = totalVisits; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getEmergencyPhone() { return emergencyPhone; }
    public void setEmergencyPhone(String emergencyPhone) { this.emergencyPhone = emergencyPhone; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public String getMedicalConditions() { return medicalConditions; }
    public void setMedicalConditions(String medicalConditions) { this.medicalConditions = medicalConditions; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getCurrentMedications() { return currentMedications; }
    public void setCurrentMedications(String currentMedications) { this.currentMedications = currentMedications; }

    public String getHealthNotes() { return healthNotes; }
    public void setHealthNotes(String healthNotes) { this.healthNotes = healthNotes; }

    public LocalDateTime getFreezeStartDate() { return freezeStartDate; }
    public void setFreezeStartDate(LocalDateTime freezeStartDate) { this.freezeStartDate = freezeStartDate; }

    public LocalDateTime getFreezeEndDate() { return freezeEndDate; }
    public void setFreezeEndDate(LocalDateTime freezeEndDate) { this.freezeEndDate = freezeEndDate; }

    public String getFreezeReason() { return freezeReason; }
    public void setFreezeReason(String freezeReason) { this.freezeReason = freezeReason; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getChronicIllnesses() { return chronicIllnesses; }
    public void setChronicIllnesses(String chronicIllnesses) { this.chronicIllnesses = chronicIllnesses; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public String getRegDocNumber() { return regDocNumber; }
    public void setRegDocNumber(String regDocNumber) { this.regDocNumber = regDocNumber; }

    public LocalDateTime getRegDocDate() { return regDocDate; }
    public void setRegDocDate(LocalDateTime regDocDate) { this.regDocDate = regDocDate; }

    public java.math.BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(java.math.BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }

    public LocalDateTime getLastPaymentDate() { return lastPaymentDate; }
    public void setLastPaymentDate(LocalDateTime lastPaymentDate) { this.lastPaymentDate = lastPaymentDate; }

    public LocalDateTime getNextPaymentDate() { return nextPaymentDate; }
    public void setNextPaymentDate(LocalDateTime nextPaymentDate) { this.nextPaymentDate = nextPaymentDate; }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public java.math.BigDecimal getDiscountApplied() { return discountApplied; }
    public void setDiscountApplied(java.math.BigDecimal discountApplied) { this.discountApplied = discountApplied; }

    public Boolean getIsFamilyHead() { return isFamilyHead; }
    public void setIsFamilyHead(Boolean isFamilyHead) { this.isFamilyHead = isFamilyHead; }

    public String getFamilyHeadId() { return familyHeadId; }
    public void setFamilyHeadId(String familyHeadId) { this.familyHeadId = familyHeadId; }

    public String getRelationshipToHead() { return relationshipToHead; }
    public void setRelationshipToHead(String relationshipToHead) { this.relationshipToHead = relationshipToHead; }

    public Boolean getIsMinor() { return isMinor; }
    public void setIsMinor(Boolean isMinor) { this.isMinor = isMinor; }

    public Boolean getBilledToHead() { return billedToHead; }
    public void setBilledToHead(Boolean billedToHead) { this.billedToHead = billedToHead; }

    // Falls back to isMinor when billedToHead hasn't been backfilled (e.g. a minor
    // created before this column existed) — every minor has always been billed to
    // their guardian regardless of whether this flag was explicitly stamped on them.
    public boolean isEffectivelyBilledToHead() {
        return Boolean.TRUE.equals(billedToHead) || Boolean.TRUE.equals(isMinor);
    }

    public String getFaceId() { return faceId; }
    public void setFaceId(String faceId) { this.faceId = faceId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getAppUsername() { return appUsername; }
    public void setAppUsername(String appUsername) { this.appUsername = appUsername; }

    public Boolean getAppAccessEnabled() { return appAccessEnabled; }
    public void setAppAccessEnabled(Boolean appAccessEnabled) { this.appAccessEnabled = appAccessEnabled; }

    public BigDecimal getWalletBalance() { return walletBalance; }
    public void setWalletBalance(BigDecimal walletBalance) { this.walletBalance = walletBalance; }
}
