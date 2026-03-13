package com.company.project.dto;

import java.math.BigDecimal;

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
}
