package com.company.project.dto.mobile.profile;

import com.company.project.entities.UserProfile;

public class MobileProfileDTO {
    private String fullName;
    private String phone;
    // Read-only: account email from User, not persisted via profile updates.
    private String email;
    private String dateOfBirth;
    private String gender;
    private String nationality;
    private String address;
    private String emergencyContact;
    private String emergencyPhone;
    private String bloodType;
    private String medicalConditions;
    private String allergies;
    private String currentMedications;
    private String chronicIllnesses;
    private Double height;
    private Double weight;
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
        dto.setAllergies(profile.getAllergies());
        dto.setCurrentMedications(profile.getCurrentMedications());
        dto.setChronicIllnesses(profile.getChronicIllnesses());
        dto.setHeight(profile.getHeight());
        dto.setWeight(profile.getWeight());
        dto.setPhotoUrl(profile.getPhotoUrl());
        return dto;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getCurrentMedications() { return currentMedications; }
    public void setCurrentMedications(String currentMedications) { this.currentMedications = currentMedications; }

    public String getChronicIllnesses() { return chronicIllnesses; }
    public void setChronicIllnesses(String chronicIllnesses) { this.chronicIllnesses = chronicIllnesses; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
}
