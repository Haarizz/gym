package com.company.project.dto;

import com.company.project.entities.Member;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/**
 * Response DTO that maps directly to the frontend TypeScript Member interface.
 * Jackson serializes camelCase fields to snake_case via the global SNAKE_CASE strategy.
 */
public class MemberResponseDTO {

    private String id;           // String so frontend TypeScript id: string is satisfied
    private String memberId;     // MBR-XXXXXXXXXX
    private String name;
    private String email;
    private String phone;
    private String membershipType;
    private String membershipStatus;
    private String membershipPlan;
    private String joinDate;
    private String membershipStartDate;
    private String membershipEndDate;
    private String expiryDate;
    private BigDecimal monthlyFee;
    private BigDecimal membershipFee;
    private Integer totalVisits;
    private String paymentStatus;
    private String emergencyContact;
    private String emergencyPhone;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String dateOfBirth;
    private String bloodType;
    private String medicalConditions;
    private String allergies;
    private String currentMedications;
    private String healthNotes;
    private String freezeStartDate;
    private String freezeEndDate;
    private String freezeReason;
    private String createdAt;
    private String updatedAt;

    private String gender;
    private String nationality;
    private String address;
    private String photoUrl;
    private String chronicIllnesses;
    private Double height;
    private Double weight;
    private String regDocNumber;
    private String regDocDate;
    private java.math.BigDecimal outstandingBalance;
    private String lastPaymentDate;
    private String nextPaymentDate;
    private String paymentMethodUsed;
    private java.math.BigDecimal discountApplied;

    // Family plan fields
    private Boolean isFamilyHead;
    private String familyHeadId;
    private String relationshipToHead;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static MemberResponseDTO fromEntity(Member m) {
        MemberResponseDTO dto = new MemberResponseDTO();
        dto.id                   = String.valueOf(m.getId());
        dto.memberId             = m.getMemberId();
        dto.name                 = m.getName();
        dto.email                = m.getEmail();
        dto.phone                = m.getPhone();
        dto.membershipType       = m.getMembershipType();
        dto.membershipStatus     = m.getMembershipStatus();
        dto.membershipPlan       = m.getMembershipPlan();
        dto.joinDate             = m.getJoinDate()             != null ? m.getJoinDate().format(ISO) + "Z"             : null;
        dto.membershipStartDate  = m.getMembershipStartDate()  != null ? m.getMembershipStartDate().format(ISO) + "Z"  : null;
        dto.membershipEndDate    = m.getMembershipEndDate()    != null ? m.getMembershipEndDate().format(ISO) + "Z"    : null;
        dto.expiryDate           = m.getExpiryDate()           != null ? m.getExpiryDate().format(ISO) + "Z"           : null;
        dto.monthlyFee           = m.getMonthlyFee();
        dto.membershipFee        = m.getMembershipFee();
        dto.totalVisits          = m.getTotalVisits();
        dto.paymentStatus        = m.getPaymentStatus();
        dto.emergencyContact     = m.getEmergencyContact();
        dto.emergencyPhone       = m.getEmergencyPhone();
        dto.emergencyContactName = m.getEmergencyContactName();
        dto.emergencyContactPhone= m.getEmergencyContactPhone();
        dto.dateOfBirth          = m.getDateOfBirth()          != null ? m.getDateOfBirth().toString()                 : null;
        dto.bloodType            = m.getBloodType();
        dto.medicalConditions    = m.getMedicalConditions();
        dto.allergies            = m.getAllergies();
        dto.currentMedications   = m.getCurrentMedications();
        dto.healthNotes          = m.getHealthNotes();
        dto.freezeStartDate      = m.getFreezeStartDate()      != null ? m.getFreezeStartDate().format(ISO) + "Z"      : null;
        dto.freezeEndDate        = m.getFreezeEndDate()        != null ? m.getFreezeEndDate().format(ISO) + "Z"        : null;
        dto.freezeReason         = m.getFreezeReason();
        dto.createdAt            = m.getCreatedAt()            != null ? m.getCreatedAt().format(ISO) + "Z"            : null;
        dto.updatedAt            = m.getUpdatedAt()            != null ? m.getUpdatedAt().format(ISO) + "Z"            : null;
        dto.gender              = m.getGender();
        dto.nationality         = m.getNationality();
        dto.address             = m.getAddress();
        dto.photoUrl            = m.getPhotoUrl();
        dto.chronicIllnesses    = m.getChronicIllnesses();
        dto.height              = m.getHeight();
        dto.weight              = m.getWeight();
        dto.regDocNumber        = m.getRegDocNumber();
        dto.regDocDate          = m.getRegDocDate()          != null ? m.getRegDocDate().format(ISO) + "Z"          : null;
        dto.outstandingBalance  = m.getOutstandingBalance();
        dto.lastPaymentDate     = m.getLastPaymentDate()     != null ? m.getLastPaymentDate().format(ISO) + "Z"     : null;
        dto.nextPaymentDate     = m.getNextPaymentDate()     != null ? m.getNextPaymentDate().format(ISO) + "Z"     : null;
        dto.paymentMethodUsed   = m.getPaymentMethodUsed();
        dto.discountApplied     = m.getDiscountApplied();
        dto.isFamilyHead        = m.getIsFamilyHead();
        dto.familyHeadId        = m.getFamilyHeadId();
        dto.relationshipToHead  = m.getRelationshipToHead();
        return dto;
    }

    // ── Getters (Jackson uses these for serialization) ──────────────────────

    public String getId() { return id; }
    public String getMemberId() { return memberId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getMembershipType() { return membershipType; }
    public String getMembershipStatus() { return membershipStatus; }
    public String getMembershipPlan() { return membershipPlan; }
    public String getJoinDate() { return joinDate; }
    public String getMembershipStartDate() { return membershipStartDate; }
    public String getMembershipEndDate() { return membershipEndDate; }
    public String getExpiryDate() { return expiryDate; }
    public BigDecimal getMonthlyFee() { return monthlyFee; }
    public BigDecimal getMembershipFee() { return membershipFee; }
    public Integer getTotalVisits() { return totalVisits; }
    public String getPaymentStatus() { return paymentStatus; }
    public String getEmergencyContact() { return emergencyContact; }
    public String getEmergencyPhone() { return emergencyPhone; }
    public String getEmergencyContactName() { return emergencyContactName; }
    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public String getDateOfBirth() { return dateOfBirth; }
    public String getBloodType() { return bloodType; }
    public String getMedicalConditions() { return medicalConditions; }
    public String getAllergies() { return allergies; }
    public String getCurrentMedications() { return currentMedications; }
    public String getHealthNotes() { return healthNotes; }
    public String getFreezeStartDate() { return freezeStartDate; }
    public String getFreezeEndDate() { return freezeEndDate; }
    public String getFreezeReason() { return freezeReason; }
    public String getCreatedAt() { return createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public String getGender() { return gender; }
    public String getNationality() { return nationality; }
    public String getAddress() { return address; }
    public String getPhotoUrl() { return photoUrl; }
    public String getChronicIllnesses() { return chronicIllnesses; }
    public Double getHeight() { return height; }
    public Double getWeight() { return weight; }
    public String getRegDocNumber() { return regDocNumber; }
    public String getRegDocDate() { return regDocDate; }
    public java.math.BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public String getLastPaymentDate() { return lastPaymentDate; }
    public String getNextPaymentDate() { return nextPaymentDate; }
    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public java.math.BigDecimal getDiscountApplied() { return discountApplied; }
    public Boolean getIsFamilyHead() { return isFamilyHead; }
    public String getFamilyHeadId() { return familyHeadId; }
    public String getRelationshipToHead() { return relationshipToHead; }
}
