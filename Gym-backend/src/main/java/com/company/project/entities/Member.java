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
}
