package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for creating or updating a Member.
 * Dates are received as ISO string (e.g. "2024-01-15T00:00:00Z") and
 * parsed in MemberService to avoid Jackson date-parsing configuration issues.
 */
public class MemberRequestDTO {

    private String name;
    private String email;
    private String phone;
    private String membershipType;
    private String membershipStatus;
    private String membershipPlan;
    private Long membershipPlanId;

    // ISO date strings from frontend
    private String joinDate;
    private String membershipStartDate;
    private String membershipEndDate;
    private String expiryDate;
    private String dateOfBirth;   // "YYYY-MM-DD"

    private BigDecimal monthlyFee;
    private BigDecimal membershipFee;
    private Integer totalVisits;
    private String paymentStatus;

    private String emergencyContact;
    private String emergencyPhone;
    private String emergencyContactName;
    private String emergencyContactPhone;

    private String bloodType;
    private String medicalConditions;
    private String allergies;
    private String currentMedications;
    private String healthNotes;

    private String gender;
    private String nationality;
    private String address;
    private String photoUrl;
    private String chronicIllnesses;
    private Double height;
    private Double weight;
    private String regDocNumber;
    private String regDocDate;     // ISO date string
    private java.math.BigDecimal outstandingBalance;
    private String lastPaymentDate;
    private String nextPaymentDate;
    private String paymentMethodUsed;
    private List<PaymentSplitDTO> paymentBreakdown; // legs when paymentMethodUsed == "Mixed"
    // Specific ledger bank account (from account_heads) that received a Bank Transfer
    // payment — null for every other payment method.
    private String bankAccountCode;
    private String bankAccountName;
    private java.math.BigDecimal discountApplied;

    // Family plan fields
    private Boolean isFamilyHead;
    private String familyHeadId;
    private String relationshipToHead;
    private List<FamilyMemberDTO> familyMembers;

    // App access credentials (optional — leave blank to not create app login)
    private String appUsername;
    private String appPassword;

    // Which staff member actually handled this sale — credited toward their
    // revenue target regardless of which account is logged in. Null falls back
    // to "Admin" (see ReceiptService.resolveProcessedByName).
    private Long processedByStaffId;

    // ── Getters & Setters ───────────────────────────────────────────────────

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

    public Long getMembershipPlanId() { return membershipPlanId; }
    public void setMembershipPlanId(Long membershipPlanId) { this.membershipPlanId = membershipPlanId; }

    public String getJoinDate() { return joinDate; }
    public void setJoinDate(String joinDate) { this.joinDate = joinDate; }

    public String getMembershipStartDate() { return membershipStartDate; }
    public void setMembershipStartDate(String membershipStartDate) { this.membershipStartDate = membershipStartDate; }

    public String getMembershipEndDate() { return membershipEndDate; }
    public void setMembershipEndDate(String membershipEndDate) { this.membershipEndDate = membershipEndDate; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

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

    public String getRegDocDate() { return regDocDate; }
    public void setRegDocDate(String regDocDate) { this.regDocDate = regDocDate; }

    public java.math.BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(java.math.BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }

    public String getLastPaymentDate() { return lastPaymentDate; }
    public void setLastPaymentDate(String lastPaymentDate) { this.lastPaymentDate = lastPaymentDate; }

    public String getNextPaymentDate() { return nextPaymentDate; }
    public void setNextPaymentDate(String nextPaymentDate) { this.nextPaymentDate = nextPaymentDate; }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public java.math.BigDecimal getDiscountApplied() { return discountApplied; }
    public void setDiscountApplied(java.math.BigDecimal discountApplied) { this.discountApplied = discountApplied; }

    public Boolean getIsFamilyHead() { return isFamilyHead; }
    public void setIsFamilyHead(Boolean isFamilyHead) { this.isFamilyHead = isFamilyHead; }

    public String getFamilyHeadId() { return familyHeadId; }
    public void setFamilyHeadId(String familyHeadId) { this.familyHeadId = familyHeadId; }

    public String getRelationshipToHead() { return relationshipToHead; }
    public void setRelationshipToHead(String relationshipToHead) { this.relationshipToHead = relationshipToHead; }

    public List<FamilyMemberDTO> getFamilyMembers() { return familyMembers; }
    public void setFamilyMembers(List<FamilyMemberDTO> familyMembers) { this.familyMembers = familyMembers; }

    public String getAppUsername() { return appUsername; }
    public void setAppUsername(String appUsername) { this.appUsername = appUsername; }

    public String getAppPassword() { return appPassword; }
    public void setAppPassword(String appPassword) { this.appPassword = appPassword; }

    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }
}
