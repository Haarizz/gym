package com.company.project.dto;

import com.company.project.entities.UserProfile;

public class MobileProfileDTO {
    private String fullName;
    private String phone;
    private String dateOfBirth;
    private String gender;
    private String nationality;
    private String address;
    private String emergencyContact;
    private String emergencyPhone;
    private String bloodType;
    private String medicalConditions;
    private String photoUrl;

    public static MobileProfileDTO fromEntity(UserProfile profile) {
        if (profile == null) return null;
        MobileProfileDTO dto = new MobileProfileDTO();
        dto.setFullName(profile.getFullName());
        dto.setPhone(profile.getPhone());
        dto.setDateOfBirth(profile.getDateOfBirth() != null ? profile.getDateOfBirth().toString() : null);
        dto.setGender(profile.getGender());
        dto.setNationality(profile.getNationality());
        dto.setAddress(profile.getAddress());
        dto.setEmergencyContact(profile.getEmergencyContact());
        dto.setEmergencyPhone(profile.getEmergencyPhone());
        dto.setBloodType(profile.getBloodType());
        dto.setMedicalConditions(profile.getMedicalConditions());
        dto.setPhotoUrl(profile.getPhotoUrl());
        return dto;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getEmergencyPhone() { return emergencyPhone; }
    public void setEmergencyPhone(String emergencyPhone) { this.emergencyPhone = emergencyPhone; }

    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public String getMedicalConditions() { return medicalConditions; }
    public void setMedicalConditions(String medicalConditions) { this.medicalConditions = medicalConditions; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
}
